import { Feather } from '@expo/vector-icons'; // Expo ya incluye esta librería de iconos
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Audio from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Clipboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RecordButton } from '../components/RecordButton';

// --- Tipos para organizar mejor el código ---
type Status = 'disconnected' | 'connected' | 'connecting';
type TranscriptionItem = {
  id: string;
  timestamp: string;
  original_transcription: string;
  processedText: string;
  isLoading?: boolean;
};

export default function App() {
  // --- Estados de la App ---
  const [serverIp, setServerIp] = useState('');
  const [serverStatus, setServerStatus] = useState<Status>('disconnected');
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionItem[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const router = useRouter();
  const [isServerSectionExpanded, setIsServerSectionExpanded] = useState(true);
  const serverSectionAnim = useRef(new Animated.Value(0)).current; // Starts hidden

  // --- Cargar IP y historial al iniciar ---
  useEffect(() => {
    const loadData = async () => {
      const savedIp = await AsyncStorage.getItem('serverIp');
      const savedHistory = await AsyncStorage.getItem('transcriptionHistory');
      if (savedIp) setServerIp(savedIp);
      if (savedHistory) setTranscriptionHistory(JSON.parse(savedHistory));
    };
    loadData();
    requestPermissions();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const toggleServerSection = () => {
    setIsServerSectionExpanded(prev => !prev);
  };

  useEffect(() => {
    Animated.timing(serverSectionAnim, {
      toValue: isServerSectionExpanded ? 70 : 0, // Animate height: 70 for expanded, 0 for collapsed
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isServerSectionExpanded]);

  const handleConnect = async () => {
    if (!serverIp) {
      showToast('Por favor, introduce una IP');
      return;
    }
    setServerStatus('connecting');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout

      const response = await fetch(`http://${serverIp}:3000/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setServerStatus('connected');
        await AsyncStorage.setItem('serverIp', serverIp);
        showToast('Conectado al servidor');
        setIsServerSectionExpanded(false); // Ocultar al conectar
      } else {
        throw new Error('Servidor no encontrado');
      }
    } catch (error: any) {
      setServerStatus('disconnected');
      if (error.name === 'AbortError') {
        showToast('Error: El tiempo de espera para la conexión se ha agotado.');
      } else {
        showToast('Error de conexión con el servidor');
      }
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const permission = await Audio.getRecordingPermissionsAsync();
      if (permission.granted) {
        return true;
      }
      const { granted } = await Audio.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso denegado', 'Necesitas dar permisos de micrófono para grabar.');
      }
      return granted;
    }
    return true;
  };

  const sendAudioFile = async (uri: string) => {
    const tempId = Date.now().toString();
    
    // 1. Add a temporary item to the list
    const tempItem: TranscriptionItem = {
      id: tempId,
      timestamp: new Date().toLocaleTimeString(),
      original_transcription: 'Transcribiendo...',
      processedText: '',
      isLoading: true,
    };
    const updatedHistoryWithLoader = [tempItem, ...transcriptionHistory];
    setTranscriptionHistory(updatedHistoryWithLoader);

    const formData = new FormData();
    formData.append('audio', {
      uri,
      name: `audio-${tempId}.m4a`,
      type: 'audio/m4a',
    } as any);
    formData.append('prompt', "Hazme un resumen de la siguiente transcripción. En español. Solo pon el resumen, sin comentarios.");

    try {
      const response = await fetch(`http://${serverIp}:3000/transcribe-and-process`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        const newTranscription: TranscriptionItem = {
            id: tempId, // Use the same ID
            timestamp: tempItem.timestamp,
            original_transcription: data.original_transcription || 'No se pudo obtener la transcripción.',
            processedText: data.processedText || 'No se pudo procesar el texto.',
            isLoading: false,
        };
        // 2. Replace the temporary item with the final result
        const finalHistory = updatedHistoryWithLoader.map(item => 
            item.id === tempId ? newTranscription : item
        );
        setTranscriptionHistory(finalHistory);
        await AsyncStorage.setItem('transcriptionHistory', JSON.stringify(finalHistory));
      } else {
        throw new Error(data.error || 'Error en el servidor');
      }
    } catch (error: any) {
      showToast(`Error en el proceso: ${error.message}`);
      // 3. Remove the temporary item on error
      const historyAfterError = updatedHistoryWithLoader.filter(item => item.id !== tempId);
      setTranscriptionHistory(historyAfterError);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.serverHeader}>
        <View style={styles.serverTitleContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: serverStatus === 'connected' ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.label}>Servidor</Text>
        </View>
        <TouchableOpacity onPress={toggleServerSection}>
            <Feather name={isServerSectionExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="white" />
        </TouchableOpacity>
      </View>

      <Animated.View style={{ height: serverSectionAnim, overflow: 'hidden', backgroundColor: '#1C1C1E' }}>
          <View style={styles.ipInputContainer}>
            <TextInput
                value={serverIp}
                onChangeText={setServerIp}
                placeholder="192.168.1.100"
                style={styles.input}
                keyboardType="numeric"
                editable={serverStatus !== 'connecting'}
            />
            <TouchableOpacity onPress={handleConnect} style={styles.connectButton} disabled={serverStatus === 'connecting'}>
                {serverStatus === 'connecting' ? <ActivityIndicator color="#fff" /> : <Text style={styles.connectButtonText}>Conectar</Text>}
            </TouchableOpacity>
          </View>
      </Animated.View>
      
      {/* --- Contenido Principal (con Overlay) --- */}
      <View style={{ flex: 1, position: 'relative' }}>
        {serverStatus !== 'connected' && <View style={styles.overlay} />}
        
        <View style={{ flex: 1, opacity: serverStatus === 'connected' ? 1 : 0.3 }}>
          {/* --- Sección de Grabación --- */}
          <View style={styles.recordingSection}>
            <RecordButton
              serverStatus={serverStatus}
              sendAudioFile={sendAudioFile}
              showToast={showToast}
            />
          </View>

          {/* --- Sección de Historial --- */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Historial</Text>
            <ScrollView>
              {transcriptionHistory.length === 0 ? (
                <Text style={styles.emptyHistoryText}>Tus transcripciones aparecerán aquí.</Text>
              ) : (
                transcriptionHistory.map(item => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.historyItem}
                    onPress={() => !item.isLoading && router.push({ pathname: '/detail', params: { item: JSON.stringify(item) }})}
                    disabled={serverStatus !== 'connected' || item.isLoading}
                  >
                    {item.isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#fff" />
                            <Text style={styles.loadingText}>Transcribiendo...</Text>
                        </View>
                    ) : (
                        <>
                            {/* Transcripción Original */}
                            <Text style={styles.historySubTitle}>Transcripción Original</Text>
                            <Text style={styles.historyText} numberOfLines={2}>{item.original_transcription}</Text>
                            
                            {/* Texto Procesado */}
                            <Text style={[styles.historySubTitle, { marginTop: 15, color: '#0A84FF' }]}>Texto Procesado</Text>
                            <Text style={styles.historyText} numberOfLines={2}>{item.processedText}</Text>

                            <View style={styles.historyItemFooter}>
                                <Text style={styles.historyTimestamp}>{item.timestamp}</Text>
                                <TouchableOpacity 
                                    style={{padding: 5}}
                                    onPress={(e) => {
                                    e.stopPropagation();
                                    const fullText = `Original:\n${item.original_transcription}\n\nProcesado:\n${item.processedText}`;
                                    Clipboard.setString(fullText); 
                                    showToast('Copiado al portapapeles');
                                    }}
                                    disabled={serverStatus !== 'connected'}
                                >
                                    <Feather name="copy" size={18} color="#999" />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* --- Toast (Snackbar) --- */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 40,
    backgroundColor: '#1C1C1E',
    zIndex: 2,
  },
  serverTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: { fontSize: 18, color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  ipInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#333',
    marginHorizontal: 15,
    borderRadius: 10,
    marginTop: 5, // Espacio desde el header
  },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  input: { flex: 1, height: 50, color: '#fff', fontSize: 16, paddingHorizontal: 10 },
  connectButton: { backgroundColor: '#007AFF', padding: 15, borderTopRightRadius: 10, borderBottomRightRadius: 10, justifyContent: 'center' },
  connectButtonText: { color: '#fff', fontWeight: 'bold' },
  
  recordingSection: { flex: 0.8, justifyContent: 'center', alignItems: 'center' },
  recordButtonContainer: { justifyContent: 'center', alignItems: 'center', width: 200, height: 200, borderRadius: 100, backgroundColor: '#1E1E1E', borderWidth: 2, borderColor: '#444' },
  recordButtonText: { color: '#fff', marginTop: 10, fontSize: 16 },
  
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#fff',
    fontSize: 16,
  },
  historySection: { flex: 1, marginTop: 20, paddingHorizontal: 15 },
  historyTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  historySubTitle: { fontSize: 14, color: '#aaa', fontWeight: '600', marginBottom: 5 },
  emptyHistoryText: { color: '#888', textAlign: 'center', marginTop: 40 },
  historyItem: { backgroundColor: '#2a2a2a', padding: 15, borderRadius: 8, marginBottom: 10 },
  historyText: { color: '#fff', fontSize: 16 },
  historyItemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  historyTimestamp: { color: '#888', fontSize: 12 },

  toastContainer: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 8 },
  toastText: { color: '#fff', textAlign: 'center' },
});

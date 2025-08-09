import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// Re-defining the type for clarity, though it should be consistent with the main screen.
type TranscriptionItem = {
    id: string;
    timestamp: string;
    original_transcription: string;
    processedText: string;
};

type QnAPair = {
    question: string;
    answer: string;
    isLoading: boolean;
};

const CollapsibleSection = ({ title, children, iconName, iconColor }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const animation = useRef(new Animated.Value(0)).current;

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    useEffect(() => {
        Animated.timing(animation, {
            toValue: isExpanded ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isExpanded]);

    const contentHeight = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 200], // Adjust max height as needed
    });

    return (
        <View style={styles.section}>
            <TouchableOpacity onPress={toggleExpand} style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name={iconName} size={20} color={iconColor} />
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="#A9A9A9" />
            </TouchableOpacity>
            <Animated.View style={{ height: contentHeight, overflow: 'hidden' }}>
                <ScrollView nestedScrollEnabled>{children}</ScrollView>
            </Animated.View>
        </View>
    );
};


export default function TranscriptionDetail() {
    const { item: itemString } = useLocalSearchParams<{ item: string }>();
    if (!itemString) {
        return <View style={styles.container}><Text style={styles.errorText}>No se pudo cargar la transcripción.</Text></View>;
    }
    const item: TranscriptionItem = JSON.parse(itemString);

    const [conversation, setConversation] = useState<QnAPair[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (e) => setKeyboardHeight(e.endCoordinates.height)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setKeyboardHeight(0)
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const handleAskQuestion = async () => {
        if (!currentQuestion.trim() || !item.processedText) return;

        const newQuestion = currentQuestion;
        
        // Add question to conversation with a loading state
        setConversation(prev => [...prev, { question: newQuestion, answer: '', isLoading: true }]);
        setCurrentQuestion('');

        // Construct the context
        let context = `CONTEXTO:\n${item.processedText}\n\n`;
        conversation.forEach(qna => {
            if (!qna.isLoading) { // Only include fully loaded Q&As in the context
                context += `PREGUNTA ANTERIOR: ${qna.question}\nRESPUESTA ANTERIOR: ${qna.answer}\n`;
            }
        });

        try {
            const serverIp = await AsyncStorage.getItem('serverIp');
            if (!serverIp) {
                alert('No se pudo encontrar la IP del servidor.');
                throw new Error("Server IP not found");
            }

            const response = await fetch(`http://${serverIp}:3000/process-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: context, prompt: newQuestion + 'dame la respuesta en español' }),
            });

            const data = await response.json();

            if (response.ok) {
                setConversation(prev => prev.map(qna => 
                    qna.question === newQuestion && qna.isLoading ? { ...qna, answer: data.processedText, isLoading: false } : qna
                ));
            } else {
                throw new Error(data.error || 'Error al procesar la pregunta.');
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
            setConversation(prev => prev.filter(qna => !(qna.question === newQuestion && qna.isLoading)));
        }
    };

    useEffect(() => {
        if(scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [conversation]);


    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: `Grabación de ${item.timestamp}`, headerStyle: { backgroundColor: '#1C1C1E' }, headerTintColor: '#fff', headerBackTitle: 'Atrás' }} />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.innerContainer, { paddingBottom: Platform.OS === 'android' ? keyboardHeight + 15 : 0 }]}>
                    <CollapsibleSection title="Transcripción Original" iconName="mic" iconColor="#A9A9A9">
                        <View style={styles.collapsibleContent}>
                            <Text style={styles.segmentText}>{item.original_transcription}</Text>
                        </View>
                    </CollapsibleSection>

                    <CollapsibleSection title="Resumen Generado" iconName="zap" iconColor="#0A84FF">
                        <View style={styles.collapsibleContent}>
                            <Text style={styles.summaryText}>{item.processedText}</Text>
                        </View>
                    </CollapsibleSection>

                    <ScrollView ref={scrollViewRef} contentContainerStyle={styles.conversationContainer}>
                        {conversation.map((qna, index) => (
                            <View key={index}>
                                <View style={styles.questionCard}>
                                    <Text style={styles.qnaText}>{qna.question}</Text>
                                </View>
                                <View style={styles.answerCard}>
                                    {qna.isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.qnaText}>{qna.answer}</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Haz una pregunta..."
                            placeholderTextColor="#888"
                            value={currentQuestion}
                            onChangeText={setCurrentQuestion}
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={handleAskQuestion} disabled={!currentQuestion.trim()}>
                            <Feather name="send" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    innerContainer: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    },
    sectionTitle: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 10,
    },
    collapsibleContent: {
        paddingBottom: 15,
    },
    summaryText: { color: '#EAEAEA', fontSize: 16, lineHeight: 24 },
    segmentText: { color: '#EAEAEA', fontSize: 16 },
    conversationContainer: {
        flexGrow: 1,
        padding: 15,
    },
    questionCard: {
        alignSelf: 'flex-end',
        backgroundColor: '#0A84FF',
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 15,
        maxWidth: '80%',
        marginBottom: 5,
    },
    answerCard: {
        alignSelf: 'flex-start',
        backgroundColor: '#2C2C2E',
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 15,
        maxWidth: '80%',
        marginBottom: 15,
    },
    qnaText: {
        color: '#fff',
        fontSize: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
        backgroundColor: '#1C1C1E',
    },
    input: {
        flex: 1,
        backgroundColor: '#3A3A3C',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 16,
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#0A84FF',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#F44336',
        textAlign: 'center',
        marginTop: 50,
        fontSize: 18,
    },
});

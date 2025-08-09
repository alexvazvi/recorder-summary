import { Feather } from '@expo/vector-icons';
import * as Audio from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  serverStatus: 'disconnected' | 'connected' | 'connecting';
  sendAudioFile: (uri: string) => void;
  showToast: (message: string) => void;
};

export function RecordButton({ serverStatus, sendAudioFile, showToast }: Props) {
  const [recordTime, setRecordTime] = useState(0);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const recordingOptions: Audio.RecordingOptions = {
    numberOfChannels: 1,
    sampleRate: 44100,
    bitRate: 128000,
    extension: '.m4a',
    ios: {
      outputFormat: 'mpeg4-aac',
      audioQuality: Audio.AudioQuality.MAX,
    },
    android: {
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
    },
  };

  const recorder = Audio.useAudioRecorder(recordingOptions);

  useEffect(() => {
    if (recorder.isRecording) {
      startPulse();
      setRecordTime(0);
      timerInterval.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      stopPulse();
    }
  }, [recorder.isRecording]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const startRecording = async () => {
    if (serverStatus !== 'connected') {
      showToast('Primero conéctate a un servidor');
      return;
    }
    try {
      // We must prepare the recorder before we can record.
      await recorder.prepareToRecordAsync(recordingOptions);
      recorder.record();
    } catch (error) {
      console.error('Failed to start recording', error);
      showToast('No se pudo iniciar la grabación.');
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        sendAudioFile(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      showToast('No se pudo detener la grabación.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <TouchableOpacity
      style={styles.recordButtonContainer}
      onPress={recorder.isRecording ? stopRecording : startRecording}
      disabled={serverStatus !== 'connected'}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Feather name="mic" size={40} color={serverStatus === 'connected' ? '#fff' : '#aaa'} />
      </Animated.View>
      {recorder.isRecording ? (
        <Text style={styles.recordButtonText}>{formatTime(recordTime)}</Text>
      ) : (
        <Text style={styles.recordButtonText}>Toca para Grabar</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  recordButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#444',
  },
  recordButtonText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});

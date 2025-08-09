# Recorder Summary App

This is a React Native mobile application, built with Expo, that allows users to record audio, get a transcription, and then interact with an AI to get summaries and ask follow-up questions about the transcribed text.

## Features

- **Audio Recording:** Record audio directly from the app.
- **AI-Powered Transcription:** Transcribe recorded audio using a backend powered by Whisper.cpp.
- **AI-Powered Summarization:** Get a concise summary of the transcription using a Llama.cpp-based language model.
- **Conversational AI:** Engage in a chat-like conversation with the AI to ask follow-up questions about the summary. The AI maintains the context of the conversation for more accurate answers.
- **History:** All recordings, transcriptions, and summaries are saved to the device for future reference.
- **Collapsible UI:** The UI is designed to be clean and intuitive, with collapsible sections for the transcription and summary, and a persistent header for server management.

## Tech Stack

- **Frontend:**
  - [React Native](https://reactnative.dev/)
  - [Expo](https://expo.dev/)
  - [Expo Router](https://docs.expo.dev/router/introduction/) for navigation
  - [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/) for recording

- **Backend (Required):**
  - A Node.js server with endpoints for transcription and text processing.
  - [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) for audio transcription.
  - [Llama.cpp](https://github.com/ggerganov/llama.cpp) for language model inference.

## Getting Started

### Prerequisites

- Node.js and npm installed.
- An Android or iOS emulator/device.
- A running instance of the backend server with Whisper.cpp and Llama.cpp.

### Frontend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/alexvazvi/recorder-summary.git
   cd recorder-summary
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the app:**
   ```bash
   npx expo start
   ```

   Follow the instructions in the terminal to open the app on your emulator or device.

### Backend Setup

This application requires a backend server to handle the AI processing. The server should have the following endpoints:

- `POST /transcribe-and-process`: Receives an audio file and a prompt, and returns a JSON object with the transcription and a processed (e.g., summarized) text.
- `POST /process-text`: Receives a block of text (the conversation context) and a prompt (the user's question), and returns a JSON object with the AI's response.

You will need to configure the IP address of your backend server in the app's UI to connect to it.

## How It Works

1. **Record Audio:** The user records an audio clip using the app.
2. **Transcribe and Summarize:** The app sends the audio to the backend, which uses Whisper.cpp to transcribe it and then Llama.cpp to generate a summary.
3. **View and Interact:** The user can view the transcription and summary. They can then ask follow-up questions about the summary.
4. **Maintain Context:** With each new question, the app sends the entire conversation history to the backend, allowing the AI to provide context-aware answers.

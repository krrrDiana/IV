const recordButton = document.getElementById('recordButton');
const personaSelect = document.getElementById('persona');
const statusDiv = document.getElementById('status');
const transcribedText = document.getElementById('transcribedText');
const responseText = document.getElementById('responseText');

let recognition; // For Speech-to-Text (STT)

// Check for Web Speech API support
if (!('webkitSpeechRecognition' in window)) {
    statusDiv.textContent = "Error: Your browser does not support Web Speech Recognition. Try Chrome or Edge.";
    recordButton.disabled = true;
} else {
    // Initialize STT
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US'; // *** SETTING RECOGNITION LANGUAGE TO ENGLISH ***
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
}

// =========================================================================
// TTS FUNCTION (Using ENGLISH voice)
// =========================================================================
function speakResponse(text) {
    // Cancel any previous speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;

    const setAndSpeak = () => {
        // Search for an ENGLISH voice ('en') for guaranteed TTS function
        const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));

        if (voices.length > 0) {
            // Found an English voice
            utterance.voice = voices[0];
            utterance.lang = voices[0].lang;
            console.warn("Using English voice.");
        } else {
            // Fallback to default English voice
            utterance.lang = 'en-US';
            console.warn("English voice not found. Using default voice.");
        }

        // Speak the text
        speechSynthesis.speak(utterance);
    };

    // Wait for voices to load
    if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.onvoiceschanged = setAndSpeak;
    } else {
        setAndSpeak();
    }
}
// =========================================================================


// Clear results
function clearResults() {
    speechSynthesis.cancel();
    transcribedText.textContent = '';
    responseText.textContent = '';
}

// STT event handlers
recognition.onresult = event => {
    const transcript = event.results[0][0].transcript;
    transcribedText.textContent = transcript;
    sendTextToServer(transcript, personaSelect.value);
};

recognition.onerror = event => {
    if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        statusDiv.textContent = 'Error: Microphone access denied. Allow access in browser settings.';
    } else if (event.error === 'no-speech') {
        statusDiv.textContent = 'Error: No speech recognized. Try again.';
    } else {
        statusDiv.textContent = `Recognition error: ${event.error}`;
    }
    recordButton.textContent = 'Start Recording';
    recordButton.classList.remove('recording');
    recordButton.disabled = false;
};

recognition.onend = () => {
    if (recordButton.classList.contains('recording')) {
        recordButton.textContent = 'Processing...';
        statusDiv.textContent = 'Transcription complete. Generating AI response...';
        recordButton.classList.remove('recording');
    }
};


// Toggle recording state
recordButton.addEventListener('click', () => {
    clearResults();

    if (recordButton.classList.contains('recording')) {
        recognition.stop();
        recordButton.disabled = true;

    } else {
        try {
            recognition.start();
            recordButton.textContent = 'Stop Listening';
            recordButton.classList.add('recording');
            statusDiv.textContent = 'Listening... Speak now.';

        } catch (error) {
            if (error.name !== 'InvalidStateError') {
                console.error('Error starting STT:', error);
            }
        }
    }
});


// Send TEXT to the backend (Gemini)
async function sendTextToServer(text, persona) {
    if (text.length === 0) {
        statusDiv.textContent = 'Nothing was recognized. Try again.';
        recordButton.disabled = false;
        recordButton.textContent = 'Start Recording';
        return;
    }

    try {
        const response = await fetch('/api/process-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userText: text, persona: persona })
        });

        const data = await response.json();

        if (!response.ok) {
            responseText.textContent = `Error: ${data.error || 'Unknown server error.'}`;
            statusDiv.textContent = 'Error. Check the console and your Gemini API key.';
            throw new Error(`Server returned an error: ${data.details || data.error}`);
        }

        // Display and speak the results
        responseText.textContent = data.responseText;
        speakResponse(data.responseText); // Call the TTS function
        statusDiv.textContent = 'Processing complete. Inner Voice Response:';

    } catch (error) {
        console.error('Error sending/receiving data:', error);
        statusDiv.textContent = 'An error occurred. Details in console.';
    } finally {
        recordButton.textContent = 'Start Recording';
        recordButton.disabled = false;
    }
}
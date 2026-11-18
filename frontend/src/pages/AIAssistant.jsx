
 // ============================================================
 // GEMINI AI ACADEMIC ASSISTANT - FRONTEND
 // MULTILINGUAL + VOICE + GENERAL CONVERSATION
 // STUDENT ID + STUDENT NAME SEARCH
 // ============================================================

import { useEffect, useRef, useState } from "react";

import {
  Send,
  Bot,
  User,
  Sparkles,
  UserRound,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Languages
} from "lucide-react";

import "./AIAssistant.css";


// ============================================================
// LANGUAGE CONFIGURATION
// ============================================================

const LANGUAGES = {
  English: { recognition: "en-IN", speech: "en" },
  Tamil: { recognition: "ta-IN", speech: "ta" },
  Hindi: { recognition: "hi-IN", speech: "hi" },
  Malayalam: { recognition: "ml-IN", speech: "ml" },
  Telugu: { recognition: "te-IN", speech: "te" },
  Kannada: { recognition: "kn-IN", speech: "kn" },
  Bengali: { recognition: "bn-IN", speech: "bn" },
  Marathi: { recognition: "mr-IN", speech: "mr" },
  Gujarati: { recognition: "gu-IN", speech: "gu" },
  Punjabi: { recognition: "pa-IN", speech: "pa" },
  Urdu: { recognition: "ur-PK", speech: "ur" },
  Arabic: { recognition: "ar-SA", speech: "ar" },
  French: { recognition: "fr-FR", speech: "fr" },
  Spanish: { recognition: "es-ES", speech: "es" },
  German: { recognition: "de-DE", speech: "de" },
  Portuguese: { recognition: "pt-PT", speech: "pt" },
  Italian: { recognition: "it-IT", speech: "it" },
  Japanese: { recognition: "ja-JP", speech: "ja" },
  Korean: { recognition: "ko-KR", speech: "ko" },
  Chinese: { recognition: "zh-CN", speech: "zh" },
  Russian: { recognition: "ru-RU", speech: "ru" },
  Indonesian: { recognition: "id-ID", speech: "id" },
  Thai: { recognition: "th-TH", speech: "th" },
  Vietnamese: { recognition: "vi-VN", speech: "vi" },
  Turkish: { recognition: "tr-TR", speech: "tr" },
  Dutch: { recognition: "nl-NL", speech: "nl" },
  Greek: { recognition: "el-GR", speech: "el" },
  Nepali: { recognition: "ne-NP", speech: "ne" },
  Sinhala: { recognition: "si-LK", speech: "si" },
  Swahili: { recognition: "sw-KE", speech: "sw" }
};


// ============================================================
// INITIAL GREETINGS
// ============================================================

const GREETINGS = {
  English:
    "Hi! 👋 I'm your Gemini AI Academic Assistant. You can ask academic questions, discuss your performance, or have a normal conversation. Enter your Student ID or Student Name for student-specific answers.",

  Tamil:
    "வணக்கம்! 👋 நான் உங்கள் Gemini AI Academic Assistant. படிப்பு, மதிப்பெண்கள், உங்கள் செயல்திறன் பற்றிய கேள்விகளையும் சாதாரண உரையாடல்களையும் என்னிடம் கேட்கலாம். உங்கள் கல்வித் தகவல்களைக் கேட்க Student ID அல்லது Student Name கொடுக்கலாம்.",

  Hindi:
    "नमस्ते! 👋 मैं आपका Gemini AI Academic Assistant हूँ। आप पढ़ाई, प्रदर्शन और सामान्य बातचीत से जुड़े सवाल पूछ सकते हैं। अपने शैक्षणिक डेटा के लिए Student ID या Student Name दर्ज करें।",

  Malayalam:
    "നമസ്കാരം! 👋 ഞാൻ നിങ്ങളുടെ Gemini AI Academic Assistant ആണ്. പഠനത്തെക്കുറിച്ചും നിങ്ങളുടെ പ്രകടനത്തെക്കുറിച്ചും പൊതുവായ കാര്യങ്ങളെക്കുറിച്ചും ചോദിക്കാം.",

  Telugu:
    "నమస్కారం! 👋 నేను మీ Gemini AI Academic Assistant. చదువు, మీ పనితీరు మరియు సాధారణ విషయాల గురించి నన్ను అడగవచ్చు.",

  Kannada:
    "ನಮಸ್ಕಾರ! 👋 ನಾನು ನಿಮ್ಮ Gemini AI Academic Assistant. ಓದು, ನಿಮ್ಮ ಕಾರ್ಯಕ್ಷಮತೆ ಮತ್ತು ಸಾಮಾನ್ಯ ವಿಷಯಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು."
};


function getGreeting(language) {
  return GREETINGS[language] || GREETINGS.English;
}


// ============================================================
// FORMAT DUPLICATE STUDENT CANDIDATES
// ============================================================

function formatCandidates(candidates) {

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "";
  }

  const details = candidates.map((candidate, index) => {

    if (typeof candidate === "string") {
      return `${index + 1}. ${candidate}`;
    }

    const name =
      candidate.student_name ||
      candidate.name ||
      candidate.display_name ||
      "";

    const id =
      candidate.student_id ||
      candidate.id ||
      candidate.roll_no ||
      "";

    const dataset =
      candidate.dataset_name ||
      candidate.dataset ||
      "";

    const parts = [];

    if (name) parts.push(`Name: ${name}`);
    if (id) parts.push(`ID: ${id}`);
    if (dataset) parts.push(`Dataset: ${dataset}`);

    return `${index + 1}. ${parts.join(" | ") || "Matching student record"}`;

  });

  return details.join("\n");
}


// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:5000"
).replace(/\/+$/, "");


// ============================================================
// MAIN COMPONENT
// ============================================================

function AIAssistant() {

  const [studentId, setStudentId] = useState("");

  const [studentName, setStudentName] = useState("");

  const [question, setQuestion] = useState("");

  const [language, setLanguage] = useState("English");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: getGreeting("English")
    }
  ]);

  const [loading, setLoading] = useState(false);

  const [listening, setListening] = useState(false);

  const [speaking, setSpeaking] = useState(false);

  const [voiceError, setVoiceError] = useState("");

  const recognitionRef = useRef(null);

  const chatEndRef = useRef(null);

  const requestRef = useRef(false);

  const mountedRef = useRef(true);


  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {

    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });

  }, [messages, loading]);


  // ==========================================================
  // COMPONENT CLEANUP
  // ==========================================================

  useEffect(() => {

    mountedRef.current = true;

    return () => {

      mountedRef.current = false;

      try {
        recognitionRef.current?.abort();
      } catch (error) {
        // Ignore cleanup errors.
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

    };

  }, []);


  // ==========================================================
  // STOP VOICE PLAYBACK
  // ==========================================================

  const stopVoice = () => {

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
  };


  // ==========================================================
  // GET MATCHING LANGUAGE VOICE
  // ==========================================================

  const getMatchingVoice = (languageCode) => {

    if (!("speechSynthesis" in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();

    const target = languageCode.toLowerCase();

    const exactMatch = voices.find(
      (voice) => voice.lang.toLowerCase() === target
    );

    if (exactMatch) {
      return exactMatch;
    }

    const baseLanguage = target.split("-")[0];

    const regionalMatch = voices.find(
      (voice) =>
        voice.lang.toLowerCase().split("-")[0] === baseLanguage
    );

    return regionalMatch || null;
  };


  // ==========================================================
  // READ ASSISTANT ANSWER ALOUD
  // ==========================================================

  const speakAnswer = (text) => {

    if (
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {

      setVoiceError(
        "Voice playback is not supported in this browser. Please try Chrome or Edge."
      );

      return;
    }

    if (!text || !text.trim()) {
      return;
    }

    stopVoice();

    setVoiceError("");

    const selectedLanguage = LANGUAGES[language];

    if (!selectedLanguage) {

      setVoiceError(
        "The selected language voice is not configured."
      );

      return;
    }

    const matchingVoice = getMatchingVoice(
      selectedLanguage.speech
    );

    if (!matchingVoice) {

      setVoiceError(
        `A ${language} voice is not installed or available in this browser. Please install a matching system voice or try another supported language.`
      );

      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.voice = matchingVoice;
    utterance.lang = matchingVoice.lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      if (mountedRef.current) {
        setSpeaking(true);
      }
    };

    utterance.onend = () => {
      if (mountedRef.current) {
        setSpeaking(false);
      }
    };

    utterance.onerror = (event) => {

      if (mountedRef.current) {

        setSpeaking(false);

        if (event.error !== "canceled") {
          setVoiceError(
            "Voice playback failed. Please try again."
          );
        }

      }

    };

    window.speechSynthesis.speak(utterance);
  };


  // ==========================================================
  // MICROPHONE INPUT
  // ==========================================================

  const toggleListening = () => {

    setVoiceError("");

    if (listening) {

      try {
        recognitionRef.current?.stop();
      } catch (error) {
        // Ignore stop errors.
      }

      setListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

      setVoiceError(
        "Voice input is not supported in this browser. Please try Google Chrome or Microsoft Edge."
      );

      return;
    }

    const selectedLanguage = LANGUAGES[language];

    if (!selectedLanguage) {

      setVoiceError(
        "The selected microphone language is not configured."
      );

      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = selectedLanguage.recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (mountedRef.current) {
        setListening(true);
      }
    };

    recognition.onresult = (event) => {

      let finalTranscript = "";
      let interimTranscript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {

        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }

      }

      const transcript = (
        finalTranscript || interimTranscript
      ).trim();

      if (mountedRef.current && transcript) {
        setQuestion(transcript);
      }

    };

    recognition.onerror = (event) => {

      if (!mountedRef.current) {
        return;
      }

      setListening(false);

      if (event.error === "not-allowed") {

        setVoiceError(
          "Please allow microphone access in your browser settings."
        );

      } else if (event.error === "no-speech") {

        setVoiceError(
          "No speech detected. Please try speaking again."
        );

      } else if (event.error === "language-not-supported") {

        setVoiceError(
          `Voice recognition for ${language} is not supported by this browser. You can type your question instead.`
        );

      } else if (event.error !== "aborted") {

        setVoiceError(
          "Could not recognize your voice. Please try again."
        );

      }

    };

    recognition.onend = () => {

      if (mountedRef.current) {
        setListening(false);
      }

      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {

      recognition.start();

    } catch (error) {

      setListening(false);
      recognitionRef.current = null;

      setVoiceError(
        "Unable to start the microphone. Please try again."
      );

    }

  };


  // ==========================================================
  // SEND QUESTION TO FLASK + GEMINI
  // ==========================================================

  const askAssistant = async (questionOverride) => {

    const trimmedStudentId = studentId.trim();

    const trimmedStudentName = studentName.trim();

    const trimmedQuestion = String(
      questionOverride ?? question
    ).trim();

    if (requestRef.current) {
      return;
    }

    if (!trimmedQuestion) {

      setVoiceError(
        "Please enter your question first."
      );

      return;
    }

    if (listening) {

      try {
        recognitionRef.current?.stop();
      } catch (error) {
        // Ignore stop errors.
      }

      setListening(false);
    }

    stopVoice();

    setVoiceError("");

    requestRef.current = true;
    setLoading(true);


    // Keep recent conversation history.
    const history = messages
      .filter(
        (message) =>
          message.role === "user" ||
          message.role === "assistant"
      )
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.text
      }));


    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        text: trimmedQuestion
      }
    ]);

    setQuestion("");


    try {

      const response = await fetch(
        `${API_BASE_URL}/api/assistant`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            student_id: trimmedStudentId,

            student_name: trimmedStudentName,

            question: trimmedQuestion,

            history: history,

            response_language: language

          })
        }
      );


      let result;

      try {

        result = await response.json();

      } catch (error) {

        throw new Error(
          "The server returned an invalid response."
        );

      }


      // ------------------------------------------------------
      // DUPLICATE STUDENT HANDLING
      // ------------------------------------------------------

      if (
        result.error === "ambiguous_student" ||
        response.status === 409
      ) {

        const candidateDetails = formatCandidates(
          result.candidates
        );

        const clarificationMessage = [
          result.message ||
            "Multiple matching student records were found.",
          candidateDetails
            ? `\n\nMatching records:\n${candidateDetails}`
            : "",
          "\n\nPlease enter the correct Student ID and ask again."
        ].join("");

        throw new Error(clarificationMessage);
      }


      // ------------------------------------------------------
      // OTHER API ERRORS
      // ------------------------------------------------------

      if (!response.ok || !result.success) {

        throw new Error(
          result.message ||
          result.error ||
          `Request failed (${response.status}).`
        );

      }


      const answer = String(
        result.answer || ""
      ).trim();

      if (!answer) {

        throw new Error(
          "Gemini returned an empty answer. Please try again."
        );

      }


      if (mountedRef.current) {

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: answer
          }
        ]);

      }

    } catch (error) {

      console.error(
        "GEMINI AI ASSISTANT ERROR:",
        error
      );

      if (mountedRef.current) {

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text:
              `⚠️ ${error.message || "Unable to process your question. Please try again."}`
          }
        ]);

      }

    } finally {

      requestRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }

    }

  };


  // ==========================================================
  // ENTER KEY
  // ==========================================================

  const handleKeyDown = (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent?.isComposing
    ) {

      event.preventDefault();

      askAssistant();

    }

  };


  // ==========================================================
  // CHANGE RESPONSE LANGUAGE
  // ==========================================================

  const handleLanguageChange = (event) => {

    const newLanguage = event.target.value;

    setLanguage(newLanguage);
    setVoiceError("");

    stopVoice();

    if (listening) {

      try {
        recognitionRef.current?.stop();
      } catch (error) {
        // Ignore stop errors.
      }

      setListening(false);
    }

    // Update the initial greeting only when no conversation
    // has started.
    setMessages((previous) => {

      if (
        previous.length === 1 &&
        previous[0].role === "assistant"
      ) {

        return [
          {
            role: "assistant",
            text: getGreeting(newLanguage)
          }
        ];

      }

      return previous;

    });

  };


  // ==========================================================
  // QUICK QUESTIONS
  // ==========================================================

  const quickQuestions = [
    "How can I improve my performance?",
    "How can I improve my attendance?",
    "Which subjects should I focus on?",
    "Give me a personalized study plan",
    "Explain a topic I am learning"
  ];


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="assistant-page">

      {/* HEADER */}

      <div className="assistant-header">

        <div className="assistant-title-section">

          <div className="assistant-icon">
            <Bot size={28} />
          </div>

          <div>
            <h1>AI Academic Assistant</h1>

            <p>
              Academic guidance and friendly conversations
            </p>
          </div>

        </div>


        <div className="assistant-status">

          <Sparkles size={16} />

          Gemini AI

        </div>

      </div>


      <div className="assistant-card">


        {/* STUDENT ID, STUDENT NAME AND LANGUAGE */}

        <div className="assistant-toolbar">


          {/* STUDENT ID */}

          <div className="student-id-area">

            <label htmlFor="student-id">
              Student ID
            </label>

            <div className="student-id-input">

              <UserRound size={18} />

              <input
                id="student-id"
                type="text"
                value={studentId}
                placeholder="Optional - Enter Student ID"
                onChange={(event) =>
                  setStudentId(event.target.value)
                }
                disabled={loading}
              />

            </div>

          </div>


          {/* STUDENT NAME */}

          <div className="student-id-area">

            <label htmlFor="student-name">
              Student Name
            </label>

            <div className="student-id-input">

              <UserRound size={18} />

              <input
                id="student-name"
                type="text"
                value={studentName}
                placeholder="Optional - Enter Student Name"
                onChange={(event) =>
                  setStudentName(event.target.value)
                }
                disabled={loading}
              />

            </div>

          </div>


          {/* LANGUAGE */}

          <div className="language-area">

            <label htmlFor="assistant-language">

              <Languages size={16} />

              Answer language

            </label>


            <select
              id="assistant-language"
              value={language}
              disabled={loading}
              onChange={handleLanguageChange}
            >

              {Object.keys(LANGUAGES).map(
                (languageName) => (

                  <option
                    key={languageName}
                    value={languageName}
                  >
                    {languageName}
                  </option>

                )
              )}

            </select>

          </div>

        </div>


        {/* CHAT MESSAGES */}

        <div className="chat-area">

          {messages.map((message, index) => (

            <div
              key={index}
              className={`message-row ${message.role}`}
            >

              <div className="message-avatar">

                {message.role === "assistant" ? (

                  <Bot size={18} />

                ) : (

                  <User size={18} />

                )}

              </div>


              <div className="message-content">

                <div className="message-bubble">

                  {message.text}

                </div>


                {message.role === "assistant" && (

                  <div className="message-actions">

                    <button
                      type="button"
                      className="voice-action"
                      onClick={() =>
                        speakAnswer(message.text)
                      }
                      title="Listen to answer"
                      aria-label="Listen to answer"
                    >

                      <Volume2 size={16} />

                      Listen

                    </button>

                  </div>

                )}

              </div>

            </div>

          ))}


          {/* THINKING INDICATOR */}

          {loading && (

            <div className="message-row assistant">

              <div className="message-avatar">

                <Bot size={18} />

              </div>


              <div className="message-bubble thinking">

                <span />

                <span />

                <span />

                <small>Thinking...</small>

              </div>

            </div>

          )}


          <div ref={chatEndRef} />

        </div>


        {/* VOICE ERROR */}

        {voiceError && (

          <div
            className="voice-error"
            role="status"
          >

            {voiceError}

          </div>

        )}


        {/* QUICK QUESTIONS */}

        <div className="quick-questions">

          {quickQuestions.map((item) => (

            <button
              key={item}
              type="button"
              onClick={() => {

                setQuestion(item);

                setVoiceError("");

              }}
              disabled={loading}
            >

              {item}

            </button>

          ))}

        </div>


        {/* QUESTION INPUT */}

        <div className="assistant-input-area">


          {/* MICROPHONE */}

          <button
            type="button"
            className={`mic-button ${
              listening ? "listening" : ""
            }`}
            onClick={toggleListening}
            disabled={loading}
            title={
              listening
                ? "Stop listening"
                : "Ask using voice"
            }
            aria-label={
              listening
                ? "Stop listening"
                : "Ask using voice"
            }
          >

            {listening ? (

              <MicOff size={19} />

            ) : (

              <Mic size={19} />

            )}

          </button>


          {/* QUESTION */}

          <input
            type="text"
            value={question}
            placeholder={
              listening
                ? `Listening in ${language}...`
                : "Type your question or use the microphone..."
            }
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            onKeyDown={handleKeyDown}
            disabled={loading}
          />


          {/* STOP VOICE */}

          {speaking && (

            <button
              type="button"
              className="stop-voice-button"
              onClick={stopVoice}
              title="Stop voice playback"
              aria-label="Stop voice playback"
            >

              <VolumeX size={19} />

            </button>

          )}


          {/* SEND */}

          <button
            type="button"
            onClick={() => askAssistant()}
            disabled={loading || !question.trim()}
          >

            <Send size={18} />

            {loading ? "Sending..." : "Send"}

          </button>

        </div>


        {/* FOOTER */}

        <p className="voice-hint">

          🌍 Select your language, ask by typing or microphone,
          and tap Listen to hear the answer.

        </p>


      </div>

    </div>

  );

}


// ============================================================
// EXPORT
// ============================================================

export default AIAssistant;


// ============================================================
// END OF GEMINI AI ACADEMIC ASSISTANT FRONTEND
// ============================================================

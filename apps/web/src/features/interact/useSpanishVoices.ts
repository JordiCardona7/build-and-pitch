import { useEffect, useState } from "react";
import { spanishVoices } from "./spanishVoices";

export function useSpanishVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synthesis = window.speechSynthesis;
    const update = () => {
      const available = spanishVoices(synthesis.getVoices());
      setVoices((previous) => previous.map((voice) => voice.voiceURI).join("|") === available.map((voice) => voice.voiceURI).join("|") ? previous : available);
    };
    update();
    synthesis.addEventListener("voiceschanged", update);
    const poll = setInterval(update, 250);
    const deadline = setTimeout(() => clearInterval(poll), 2_000);
    return () => { clearInterval(poll); clearTimeout(deadline); synthesis.removeEventListener("voiceschanged", update); };
  }, []);
  return { voices, voiceURI, setVoiceURI };
}

export function speak(text){

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );

    utterance.lang = "ko-KR";

    speechSynthesis.speak(
        utterance
    );

}
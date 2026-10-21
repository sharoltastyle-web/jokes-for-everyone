"use client";

import { useRef, useState, type FormEvent } from "react";
import { requestJoke } from "@/lib/jokeClient";
import styles from "./JokeForm.module.css";

type Status = "idle" | "loading" | "success" | "error";

const LOADING_TEXT = "מכינים לך בדיחה…";
const ERROR_TEXT = "לא הצלחנו ליצור בדיחה. נסו שוב";

export default function JokeForm() {
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [joke, setJoke] = useState("");
  // Guards against double submission before React re-renders the disabled button.
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("loading");
    try {
      setJoke(await requestJoke(topic));
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  const loading = status === "loading";

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor="topic" className={styles.label}>
          נושא לבדיחה (לא חובה)
        </label>
        <input
          id="topic"
          type="text"
          className={styles.input}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          autoComplete="off"
          enterKeyHint="go"
        />
        <button type="submit" className={styles.button} disabled={loading}>
          צרו לי בדיחה
        </button>
      </form>

      <div aria-live="polite" className={styles.result}>
        {status !== "idle" && (
          <p
            className={`${styles.card} ${status === "error" ? styles.cardError : ""}`}
          >
            {status === "loading" && LOADING_TEXT}
            {status === "success" && joke}
            {status === "error" && ERROR_TEXT}
          </p>
        )}
      </div>
    </>
  );
}

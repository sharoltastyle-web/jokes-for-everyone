import JokeForm from "@/components/JokeForm";
import Decorations from "@/components/Decorations";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <Decorations />
      <main className={styles.main}>
        <h1 className={styles.title}>יצירת בדיחה</h1>
        <JokeForm />
      </main>
    </>
  );
}

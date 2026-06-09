import { motion } from "framer-motion";
import { Bell, MessageCircle, ShieldCheck, UsersRound } from "lucide-react";
import { fadeUp, staggerContainer } from "../motionPresets";

const steps = [
  {
    icon: MessageCircle,
    title: "Make conversations feel alive",
    body: "Presence, typing, read states, media, and search are ready in your workspace.",
  },
  {
    icon: UsersRound,
    title: "Create your first group",
    body: "Bring people together with avatars, member selection, realtime group chat, and admin-ready structure.",
  },
  {
    icon: Bell,
    title: "Stay in the loop",
    body: "Unread badges and notification surfaces are prepared for deeper notification routing.",
  },
  {
    icon: ShieldCheck,
    title: "Grow safely",
    body: "The app is shaped for Postgres, Redis Channels, and future voice/video signaling.",
  },
];

export default function OnboardingFlow({ user, onFinish = () => {}, onCreateGroup = () => {} }) {
  return (
    <main className="onboarding-shell">
      <motion.section
        className="onboarding-panel"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.span className="hero-kicker" variants={fadeUp}>
          welcome to .connect
        </motion.span>
        <motion.h1 variants={fadeUp}>
          Let's set up your <span className="connect-wordmark inline-wordmark">.connect</span> space, {user?.username || 'friend'}.
        </motion.h1>
        <motion.p variants={fadeUp}>
          You can start with direct messages now, then add groups, roles, notifications, and calls as your platform grows.
        </motion.p>
        <motion.div className="onboarding-grid" variants={staggerContainer}>
          {steps.map(({ icon: Icon, title, body }) => (
            <motion.article 
              variants={fadeUp} 
              key={title}
              whileHover={{ 
                y: -4,
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                transition: { duration: 0.2 }
              }}
              className="onboarding-card"
            >
              <Icon size={20} />
              <h3>{title}</h3>
              <p>{body}</p>
            </motion.article>
          ))}
        </motion.div>
        <motion.div className="onboarding-actions" variants={fadeUp}>
          <button 
            className="hero-primary" 
            onClick={onCreateGroup}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Create a group
          </button>
          <button 
            className="hero-secondary" 
            onClick={onFinish}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Enter .connect
          </button>
        </motion.div>
      </motion.section>
    </main>
  );
}

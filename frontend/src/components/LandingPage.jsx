import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ArrowRight,
  Mic,
  Sparkles,
  UsersRound,
  Video,
  Zap,
  MessageSquare,
  Lock,
  Activity,
  Play,
  ChevronRight,
  Globe,
} from "lucide-react";

// --- Design System Constants ---
const COLORS = {
  primary: "#14B8A6",
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

// --- Sub-Components ---

function Typewriter({ texts }) {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(100);

  useEffect(() => {
    const handleType = () => {
      const currentFullText = texts[index % texts.length];
      if (isDeleting) {
        setDisplayText(currentFullText.substring(0, displayText.length - 1));
        setSpeed(50);
      } else {
        setDisplayText(currentFullText.substring(0, displayText.length + 1));
        setSpeed(100);
      }
      if (!isDeleting && displayText === currentFullText) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setIndex(index + 1);
        setSpeed(500);
      }
    };
    const timer = setTimeout(handleType, speed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, index, texts, speed]);

  return (
    <span className="text-teal-400">
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-[3px] h-[1em] bg-teal-400 ml-1 translate-y-1"
      />
    </span>
  );
}

function NetworkBackground() {
  const dots = useRef(
    [...Array(20)].map(() => ({
      cx: `${10 + Math.random() * 80}%`,
      cy: `${10 + Math.random() * 80}%`,
      duration: 3 + Math.random() * 2,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <svg className="w-full h-full" viewBox="0 0 800 800">
        {dots.current.map((dot, i) => (
          <motion.circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r="2"
            fill={COLORS.primary}
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: dot.duration, repeat: Infinity }}
          />
        ))}
      </svg>
    </div>
  );
}

function StatCounter({ value, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const target = parseInt(value.replace(/,/g, ""));
      let start = 0;
      const duration = 2000;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setDisplayValue(target);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-white mb-2">
        {displayValue.toLocaleString()}
        {value.includes("+") ? "+" : value.includes("%") ? "%" : ""}
      </div>
      <div className="text-slate-400 uppercase tracking-widest text-xs font-bold">{label}</div>
    </div>
  );
}

// --- Main Page Component ---

export default function LandingPage({ logoUrl, onLogin, onSignup }) {
  const [scrolled, setScrolled] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-page min-h-screen bg-[#050816] text-white selection:bg-teal-500/30 font-sans">

      {/* Floating Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-6 ${
          scrolled
            ? "py-3 bg-[#050816]/80 backdrop-blur-lg border-b border-white/5"
            : "py-4 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-black text-[#050816] text-xl">
              .
            </div>
            <span className="text-xl font-bold tracking-tight">connect</span>
          </div>

          {/* Nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            {["Features", "Solutions", "About"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="hover:text-teal-400 transition-colors"
              >
                {link}
              </a>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onLogin}
              className="text-sm font-semibold hover:text-teal-400 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onSignup}
              className="bg-teal-500 hover:bg-teal-400 text-[#050816] px-4 sm:px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg shadow-teal-500/20 active:scale-95 whitespace-nowrap"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-screen flex items-center pt-20 pb-16 px-4 sm:px-6 overflow-hidden">
        <NetworkBackground />

        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">

          {/* Left — copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-teal-400 text-xs font-bold uppercase tracking-wider"
            >
              <Sparkles size={14} /> The next generation of chat
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
            >
              Everything You Need To{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                Stay Connected.
              </span>
            </motion.h1>

            <motion.div
              variants={fadeUp}
              className="text-lg sm:text-xl md:text-2xl font-medium text-slate-300"
            >
              Building{" "}
              <Typewriter
                texts={[
                  "meaningful conversations.",
                  "stronger communities.",
                  "seamless collaboration.",
                  ".connect.",
                ]}
              />
            </motion.div>

            <motion.p
              variants={fadeUp}
              className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl"
            >
              One platform for messaging, voice calls, video calls, communities,
              and real-time collaboration. Designed for high-velocity teams.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap justify-center lg:justify-start gap-4">
              <button
                onClick={onSignup}
                className="px-7 py-3.5 sm:px-8 sm:py-4 bg-teal-500 hover:bg-teal-400 text-[#050816] font-bold rounded-xl transition-all flex items-center gap-2 group shadow-xl shadow-teal-500/20 active:scale-95"
              >
                Get Started{" "}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-7 py-3.5 sm:px-8 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all backdrop-blur-sm">
                Watch Demo
              </button>
            </motion.div>
          </motion.div>

          {/* Right — mockup (hidden on small screens, shown from lg up) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 to-transparent rounded-3xl blur-3xl opacity-30" />

            {/* Floating notification card */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -left-6 z-20 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-w-[200px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className="text-[10px] text-teal-400 font-bold uppercase">New Message</div>
                  <div className="text-sm font-semibold text-white">Sarah: Meeting in 5?</div>
                </div>
              </div>
            </motion.div>

            {/* Floating audio card */}
            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-10 -right-6 z-20 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="flex gap-1 items-end h-5">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, 16, 8] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 bg-emerald-400 rounded-full"
                    />
                  ))}
                </div>
                <div className="text-sm font-mono font-bold text-emerald-400 tracking-tighter">
                  12:34
                </div>
              </div>
            </motion.div>

            {/* Main mockup image */}
            <div className="relative rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50 group">
              <img
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1200&q=80"
                alt="Product View"
                className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 hover:scale-110 transition-transform cursor-pointer">
                  <Play fill="white" size={24} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Showcase Section ── */}
      <section id="solutions" className="py-20 sm:py-24 px-4 sm:px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-teal-400 font-bold uppercase tracking-widest text-sm mb-4">
              Communication In Action
            </h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold italic tracking-tight">
              Built For High Performance
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: "Real-Time Messaging",
                icon: MessageSquare,
                img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
              },
              {
                title: "Crystal Clear Voice",
                icon: Mic,
                img: "https://images.unsplash.com/photo-1589467336648-566c236247c2?auto=format&fit=crop&w=600&q=80",
              },
              {
                title: "HD Video Meetings",
                icon: Video,
                img: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=600&q=80",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                className="relative h-[380px] sm:h-[420px] md:h-[450px] rounded-3xl overflow-hidden border border-white/10 bg-white/5 group"
              >
                <img
                  src={item.img}
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700"
                  alt={item.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 sm:p-8 space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-[#050816]">
                    <item.icon size={24} />
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold">{item.title}</h4>
                  <p className="text-slate-400 text-sm">
                    Experience zero-latency connectivity optimized for global teams.
                  </p>
                  <button className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                    Learn more <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="py-20 sm:py-24 px-4 sm:px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-teal-400 font-bold uppercase tracking-widest text-sm mb-4">
              What's Inside
            </h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Everything You Need
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: MessageSquare,
                title: "Smart Messaging",
                body: "Threaded replies, reactions, and advanced search functionality.",
              },
              {
                icon: UsersRound,
                title: "Group Spaces",
                body: "Rich community tools with granular permission controls.",
              },
              {
                icon: Activity,
                title: "Presence System",
                body: "Real-time activity tracking and customized status indicators.",
              },
              {
                icon: Lock,
                title: "Enterprise Security",
                body: "End-to-end encryption and production-ready data protection.",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                body: "Optimized signaling layer for sub-40ms message delivery.",
              },
              {
                icon: Globe,
                title: "Global Sync",
                body: "Distributed nodes ensure clear calls from anywhere in the world.",
              },
            ].map((feat, i) => (
              <motion.div
                key={i}
                whileHover={{ borderColor: "rgba(20,184,166,0.3)" }}
                className="p-6 sm:p-8 rounded-3xl bg-white/5 border border-white/5 transition-colors"
              >
                <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-400 mb-5 sm:mb-6">
                  <feat.icon size={24} />
                </div>
                <h4 className="text-lg sm:text-xl font-bold mb-3">{feat.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Section ── */}
      <section id="about" className="py-20 sm:py-24 px-4 sm:px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div>
            <h2 className="text-teal-400 font-bold uppercase tracking-widest text-sm mb-4">
              About .connect
            </h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Built for the way people actually communicate
            </h3>
          </div>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
            .connect is a real-time communication platform designed to bring people closer — whether
            you're a small team shipping a product, a community of creators, or friends staying in
            touch across time zones. We built it because most chat tools are either too bloated or
            too bare-bones. .connect sits in the middle: fast, focused, and genuinely enjoyable to use.
          </p>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
            At its core, .connect is about removing friction from conversation. Direct messages,
            group channels, voice and video calls, status stories, and file sharing — all in one
            place, with no switching between apps. Every feature is built around the idea that
            communication should feel effortless, not like work.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 pt-4">
            {[
              { heading: "Real-time first", text: "WebSocket-powered messaging means your words arrive the moment you send them." },
              { heading: "Privacy by design", text: "Your conversations stay yours. End-to-end encryption on all private messages." },
              { heading: "Open to everyone", text: "No paywalls on core features. Great communication shouldn't be a premium add-on." },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 text-left space-y-2">
                <h4 className="font-bold text-white">{item.heading}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Statistics ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          <StatCounter value="50,000+" label="Daily Messages" />
          <StatCounter value="10,000+" label="Active Users" />
          <StatCounter value="99.9%" label="Uptime" />
          <StatCounter value="100+" label="Communities" />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 sm:py-40 px-4 sm:px-6 relative overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-teal-500/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 space-y-8 sm:space-y-10">
          <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            Communication{" "}
            <br className="hidden sm:block" />
            <span className="text-teal-400 italic font-light">Without Limits.</span>
          </h2>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto">
            Everything you need to message, call, collaborate, and stay connected in one premium
            workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onSignup}
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-teal-500 text-[#050816] font-bold rounded-2xl hover:scale-105 transition-transform active:scale-95 shadow-2xl shadow-teal-500/20"
            >
              Start Free Now
            </button>
            <button className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white/5 border border-white/10 font-bold rounded-2xl hover:bg-white/10 transition-colors">
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-16 sm:py-20 px-4 sm:px-6 border-t border-white/5 bg-[#030612]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-12 mb-12 sm:mb-20 text-sm">
          <div className="col-span-2 space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-500 rounded flex items-center justify-center font-black text-[#050816]">
                .
              </div>
              <span className="text-lg font-bold">connect</span>
            </div>
            <p className="text-slate-500 max-w-xs leading-relaxed">
              Redefining communication for modern teams. Built with speed, privacy, and design at
              the core.
            </p>
          </div>
          {["Product", "Company", "Legal"].map((cat) => (
            <div key={cat} className="space-y-4">
              <h5 className="font-bold text-xs uppercase tracking-widest text-slate-400">{cat}</h5>
              <ul className="space-y-2 text-slate-500">
                <li className="hover:text-teal-400 cursor-pointer transition-colors">Overview</li>
                <li className="hover:text-teal-400 cursor-pointer transition-colors">Security</li>
                <li className="hover:text-teal-400 cursor-pointer transition-colors">Contact</li>
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto pt-8 sm:pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 text-xs text-slate-600">
          <p>© {currentYear} .connect Inc. All rights reserved.</p>
          <div className="flex gap-6 sm:gap-8">
            <span className="hover:text-white cursor-pointer transition-colors">Twitter / X</span>
            <span className="hover:text-white cursor-pointer transition-colors">Discord</span>
            <span className="hover:text-white cursor-pointer transition-colors">LinkedIn</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

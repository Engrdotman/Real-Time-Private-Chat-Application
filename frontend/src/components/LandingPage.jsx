import React, { useState, useEffect, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, Mic, MessageSquare, UsersRound, Video,
  Zap, Lock, Activity, Play, ChevronRight, Globe, ChevronDown,
} from "lucide-react";
import { Wordmark, AppIcon } from "./ConnectLogo";

// ─── Motion Variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Scroll-aware section reveal ────────────────────────────────────────────
function RevealSection({ children, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Typewriter ─────────────────────────────────────────────────────────────
function Typewriter({ texts }) {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(100);

  useEffect(() => {
    const handleType = () => {
      const full = texts[index % texts.length];
      if (isDeleting) {
        setDisplayText(full.substring(0, displayText.length - 1));
        setSpeed(45);
      } else {
        setDisplayText(full.substring(0, displayText.length + 1));
        setSpeed(95);
      }
      if (!isDeleting && displayText === full) setTimeout(() => setIsDeleting(true), 2200);
      else if (isDeleting && displayText === "") { setIsDeleting(false); setIndex(index + 1); setSpeed(480); }
    };
    const t = setTimeout(handleType, speed);
    return () => clearTimeout(t);
  }, [displayText, isDeleting, index, texts, speed]);

  return (
    <span className="text-teal-400 drop-shadow-[0_0_12px_rgba(20,184,166,0.5)]">
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut" }}
        className="inline-block w-[2px] h-[0.9em] bg-teal-400 ml-[3px] translate-y-[2px] rounded-full"
      />
    </span>
  );
}

// ─── Animated network dots ───────────────────────────────────────────────────
function NetworkBackground() {
  const dots = useRef(
    [...Array(24)].map(() => ({
      cx: `${8 + Math.random() * 84}%`,
      cy: `${8 + Math.random() * 84}%`,
      r: 1.2 + Math.random() * 1.4,
      duration: 3.5 + Math.random() * 3,
      delay: Math.random() * 3,
    }))
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full opacity-[0.18]" viewBox="0 0 800 800">
        {dots.current.map((d, i) => (
          <motion.circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#14B8A6"
            animate={{ opacity: [0.15, 0.55, 0.15], scale: [1, 1.8, 1] }}
            transition={{ duration: d.duration, repeat: Infinity, delay: d.delay }}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Stat Counter ────────────────────────────────────────────────────────────
function StatCounter({ value, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const target = parseInt(value.replace(/,/g, ""));
    let start = 0;
    const inc = target / (2000 / 16);
    const t = setInterval(() => {
      start += inc;
      if (start >= target) { setDisplay(target); clearInterval(t); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="text-center group"
    >
      <div className="text-4xl md:text-5xl font-black text-white mb-2 tabular-nums
                      drop-shadow-[0_0_20px_rgba(20,184,166,0.25)]
                      group-hover:drop-shadow-[0_0_28px_rgba(20,184,166,0.45)]
                      transition-all duration-500">
        {display.toLocaleString()}
        {value.includes("+") ? "+" : value.includes("%") ? "%" : ""}
      </div>
      <div className="text-slate-500 uppercase tracking-[0.18em] text-[11px] font-bold">{label}</div>
    </motion.div>
  );
}

// ─── Section label + heading helper ─────────────────────────────────────────
function SectionHeader({ eyebrow, heading, className = "" }) {
  return (
    <div className={`text-center ${className}`}>
      <motion.p variants={fadeUp}
        className="inline-flex items-center gap-2 text-teal-400 font-bold uppercase tracking-[0.2em] text-[11px] mb-5">
        <span className="w-6 h-px bg-teal-400/60 inline-block" />
        {eyebrow}
        <span className="w-6 h-px bg-teal-400/60 inline-block" />
      </motion.p>
      <motion.h3 variants={fadeUp}
        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
        {heading}
      </motion.h3>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LandingPage({ logoUrl, onLogin, onSignup }) {
  const [scrolled, setScrolled] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const currentYear = new Date().getFullYear();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="landing-page min-h-screen bg-[#040b14] text-white selection:bg-teal-500/30 font-sans antialiased">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-4 sm:px-6 ${
          scrolled
            ? "py-3 bg-[#040b14]/75 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.4)]"
            : "py-5 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Wordmark size="md" glow={true} />
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            {["Features", "Solutions", "About"].map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`}
                className="relative py-1 hover:text-white transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-teal-400 after:transition-all after:duration-300 hover:after:w-full">
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button onClick={onLogin}
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors duration-200">
              Sign In
            </button>
            <motion.button onClick={onSignup} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#040b14] px-5 py-2 rounded-full font-bold text-sm shadow-lg shadow-teal-500/25 whitespace-nowrap transition-all duration-200">
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-24 pb-20 px-4 sm:px-6 overflow-hidden">
        <NetworkBackground />

        {/* Mobile blurred bg image */}
        <div className="absolute inset-0 lg:hidden">
          <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1200&q=80"
            alt="" className="w-full h-full object-cover opacity-30 blur-[2px] scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040b14]/40 via-[#040b14]/55 to-[#040b14]" />
        </div>

        {/* Layered ambient glows */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-teal-500/[0.07] blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-teal-600/[0.08] blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-14 lg:gap-20 items-center relative z-10">

          {/* Copy */}
          <motion.div initial="hidden" animate="visible" variants={stagger}
            className="flex flex-col gap-7 text-center lg:text-left items-center lg:items-start">

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                         bg-teal-500/[0.08] border border-teal-500/20
                         text-teal-400 text-[11px] font-bold uppercase tracking-[0.16em]
                         shadow-[0_0_20px_rgba(20,184,166,0.08)]">
              <MessageSquare size={13} strokeWidth={2.5} />
              The next generation of chat
            </motion.div>

            <motion.h1 variants={fadeUp}
              className="text-[2.6rem] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-black tracking-[-0.02em] leading-[1.08]">
              Everything You Need To{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300
                               drop-shadow-[0_0_40px_rgba(20,184,166,0.3)]">
                Stay Connected.
              </span>
            </motion.h1>

            <motion.div variants={fadeUp}
              className="text-lg sm:text-xl md:text-2xl font-medium text-slate-300 leading-snug">
              Building{" "}
              <Typewriter texts={["meaningful conversations.", "stronger communities.", "seamless collaboration.", ".connect."]} />
            </motion.div>

            <motion.p variants={fadeUp}
              className="text-slate-400 text-base sm:text-[1.05rem] leading-[1.75] max-w-lg">
              One platform for messaging, voice calls, video calls, communities, and real-time
              collaboration. Designed for high-velocity teams.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4">
              <motion.button onClick={onSignup} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                className="px-7 py-3.5 sm:px-8 sm:py-4 bg-gradient-to-r from-teal-500 to-emerald-500
                           hover:from-teal-400 hover:to-emerald-400 text-[#040b14] font-bold rounded-xl
                           flex items-center gap-2 group shadow-xl shadow-teal-500/25 transition-all duration-200">
                Get Started
                <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform duration-200" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                className="px-7 py-3.5 sm:px-8 sm:py-4 bg-white/[0.04] hover:bg-white/[0.08]
                           border border-white/[0.1] hover:border-white/[0.18]
                           text-white font-bold rounded-xl backdrop-blur-sm
                           flex items-center gap-2 transition-all duration-200">
                <Play size={16} fill="white" strokeWidth={0} />
                Watch Demo
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Mockup — desktop only */}
          <motion.div initial="hidden" animate="visible" variants={scaleIn}
            className="relative hidden lg:block">
            {/* Glow behind card */}
            <div className="absolute inset-4 bg-gradient-to-tr from-teal-500/20 via-emerald-500/10 to-transparent rounded-3xl blur-2xl" />

            {/* Floating notification card */}
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-7 -left-7 z-20 p-4 rounded-2xl min-w-[210px]
                         bg-white/[0.06] backdrop-blur-2xl border border-white/[0.12]
                         shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/20 flex items-center justify-center text-teal-400 flex-shrink-0">
                  <MessageSquare size={18} strokeWidth={2} />
                </div>
                <div>
                  <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider mb-0.5">New Message</div>
                  <div className="text-sm font-semibold text-white">Sarah: Meeting in 5?</div>
                </div>
              </div>
            </motion.div>

            {/* Floating audio card */}
            <motion.div animate={{ y: [0, 14, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              className="absolute bottom-12 -right-7 z-20 p-4 rounded-2xl
                         bg-white/[0.06] backdrop-blur-2xl border border-white/[0.12]
                         shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-4">
                <div className="flex gap-[3px] items-end h-5">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div key={i} animate={{ height: [6, 18, 6] }}
                      transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                      className="w-[3px] bg-gradient-to-t from-teal-500 to-emerald-400 rounded-full" />
                  ))}
                </div>
                <div className="text-sm font-mono font-bold text-emerald-400 tracking-tight">Live · 12:34</div>
              </div>
            </motion.div>

            {/* Main mockup image */}
            <div className="relative rounded-[1.75rem] border border-white/[0.1] overflow-hidden
                            shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] group">
              <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1200&q=80"
                alt="Product View"
                className="w-full h-full object-cover grayscale-[0.15] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#040b14] via-[#040b14]/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.95 }}
                  className="w-16 h-16 bg-white/[0.12] backdrop-blur-xl rounded-full flex items-center justify-center
                             border border-white/20 cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.1)]
                             transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(20,184,166,0.3)]">
                  <Play fill="white" size={22} strokeWidth={0} className="ml-1" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Showcase ── */}
      <section id="solutions" className="py-24 sm:py-32 px-4 sm:px-6 border-y border-white/[0.05]
                                          bg-gradient-to-b from-transparent via-white/[0.01] to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={stagger} className="text-center mb-14 sm:mb-20">
            <SectionHeader eyebrow="Communication In Action" heading={<>Built For <em className="not-italic text-teal-400">High Performance</em></>} />
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-7">
            {[
              { title: "Real-Time Messaging", icon: MessageSquare, img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80" },
              { title: "Crystal Clear Voice",  icon: Mic,           img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=600&q=80" },
              { title: "HD Video Meetings",    icon: Video,         img: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=600&q=80" },
            ].map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="relative h-[400px] sm:h-[440px] md:h-[480px] rounded-[1.5rem] overflow-hidden
                           border border-white/[0.08] bg-white/[0.03] group cursor-pointer">
                <img src={item.img} loading="lazy" alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-35
                             group-hover:opacity-55 group-hover:scale-110 transition-all duration-700" />
                {/* Multi-layer gradient for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#040b14] via-[#040b14]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Top shimmer line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-7 sm:p-8 space-y-3">
                  <motion.div whileHover={{ scale: 1.1 }}
                    className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl
                               flex items-center justify-center text-[#040b14]
                               shadow-lg shadow-teal-500/30">
                    <item.icon size={22} strokeWidth={2.5} />
                  </motion.div>
                  <h4 className="text-xl sm:text-2xl font-bold text-white">{item.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Experience zero-latency connectivity optimized for global teams.
                  </p>
                  <button className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-bold text-sm transition-colors group/btn">
                    Learn more
                    <ChevronRight size={15} className="group-hover/btn:translate-x-1 transition-transform duration-200" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden">
        {/* Subtle radial bg */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(20,184,166,0.04),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={stagger} className="text-center mb-14 sm:mb-20">
            <SectionHeader eyebrow="What's Inside" heading="Everything You Need" />
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              { icon: MessageSquare, title: "Smart Messaging",    body: "Threaded replies, reactions, and advanced search functionality." },
              { icon: UsersRound,   title: "Group Spaces",        body: "Rich community tools with granular permission controls." },
              { icon: Activity,     title: "Presence System",     body: "Real-time activity tracking and customized status indicators." },
              { icon: Lock,         title: "Enterprise Security", body: "End-to-end encryption and production-ready data protection." },
              { icon: Zap,          title: "Lightning Fast",      body: "Optimized signaling layer for sub-40ms message delivery." },
              { icon: Globe,        title: "Global Sync",         body: "Distributed nodes ensure clear calls from anywhere in the world." },
            ].map((feat, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="p-7 sm:p-8 rounded-2xl relative overflow-hidden group cursor-default
                           bg-white/[0.03] border border-white/[0.07]
                           hover:border-teal-500/25 hover:bg-white/[0.05]
                           transition-colors duration-300
                           shadow-[0_1px_0_rgba(255,255,255,0.04)]">
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-2xl" />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/20 rounded-2xl
                                  flex items-center justify-center text-teal-400 mb-6
                                  group-hover:bg-teal-500/15 group-hover:border-teal-500/30
                                  transition-all duration-300 shadow-[0_0_16px_rgba(20,184,166,0.1)]
                                  group-hover:shadow-[0_0_24px_rgba(20,184,166,0.2)]">
                    <feat.icon size={22} strokeWidth={1.8} />
                  </div>
                  <h4 className="text-lg font-bold mb-2.5 text-white group-hover:text-teal-50 transition-colors">{feat.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors">{feat.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-24 sm:py-32 px-4 sm:px-6 border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto text-center">
          <RevealSection>
            <p className="inline-flex items-center gap-2 text-teal-400 font-bold uppercase tracking-[0.2em] text-[11px] mb-5">
              <span className="w-6 h-px bg-teal-400/60" />About .connect<span className="w-6 h-px bg-teal-400/60" />
            </p>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white">
              Built for the way people<br className="hidden sm:block" /> actually communicate
            </h3>
            <p className="text-slate-400 text-base sm:text-lg leading-[1.8] max-w-2xl mx-auto mb-5">
              .connect is a real-time communication platform designed to bring people closer — whether
              you're a small team, a community of creators, or friends across time zones.
            </p>
          </RevealSection>

          {/* Expandable */}
          <div className={`overflow-hidden transition-all duration-600 ease-in-out ${aboutExpanded ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="space-y-4 pb-7 text-left sm:text-center">
              <p className="text-slate-400 text-base sm:text-lg leading-[1.8] max-w-2xl mx-auto">
                We built it because most chat tools are either too bloated or too bare-bones.
                .connect sits in the middle: fast, focused, and genuinely enjoyable to use.
              </p>
              <p className="text-slate-400 text-base sm:text-lg leading-[1.8] max-w-2xl mx-auto">
                At its core, .connect is about removing friction from conversation. Direct messages,
                group channels, voice and video calls, status stories, and file sharing — all in one
                place. Every feature is built around the idea that communication should feel effortless.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-5 pb-8">
              {[
                { heading: "Real-time first",   text: "WebSocket-powered messaging means your words arrive the moment you send them." },
                { heading: "Privacy by design", text: "Your conversations stay yours. End-to-end encryption on all private messages." },
                { heading: "Open to everyone",  text: "No paywalls on core features. Great communication shouldn't be a premium add-on." },
              ].map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-left space-y-2
                             hover:border-teal-500/20 hover:bg-white/[0.05] transition-all duration-300">
                  <h4 className="font-bold text-white text-sm">{item.heading}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <button onClick={() => setAboutExpanded(v => !v)}
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 font-bold text-sm transition-colors duration-200 mt-1 group">
            {aboutExpanded ? "Show less" : "Read more"}
            <motion.span animate={{ rotate: aboutExpanded ? 180 : 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="inline-flex">
              <ChevronDown size={15} strokeWidth={2.5} />
            </motion.span>
          </button>
        </div>
      </section>

      {/* ── Statistics ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(20,184,166,0.05),transparent)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12
                          p-8 sm:p-12 rounded-3xl
                          bg-white/[0.02] border border-white/[0.06]
                          shadow-[0_0_80px_rgba(20,184,166,0.04),inset_0_1px_0_rgba(255,255,255,0.05)]
                          backdrop-blur-sm">
            <StatCounter value="50,000+" label="Daily Messages" />
            <StatCounter value="10,000+" label="Active Users" />
            <StatCounter value="99.9%"   label="Uptime" />
            <StatCounter value="100+"    label="Communities" />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-32 sm:py-44 px-4 sm:px-6 relative overflow-hidden text-center">
        {/* Multi-layer glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/[0.08] blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] bg-emerald-400/[0.06] blur-[80px] rounded-full pointer-events-none" />

        <RevealSection className="max-w-4xl mx-auto relative z-10">
          <div className="space-y-8 sm:space-y-10">
            <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-[-0.03em] leading-[1.05]">
              Communication{" "}
              <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-400
                               italic font-light drop-shadow-[0_0_60px_rgba(20,184,166,0.4)]">
                Without Limits.
              </span>
            </h2>
            <p className="text-slate-400 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
              Everything you need to message, call, collaborate, and stay connected in one premium workspace.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button onClick={onSignup} whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto px-10 py-4 sm:py-5 bg-gradient-to-r from-teal-500 to-emerald-500
                           hover:from-teal-400 hover:to-emerald-400 text-[#040b14] font-bold rounded-2xl
                           shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:shadow-[0_0_60px_rgba(20,184,166,0.45)]
                           transition-all duration-300 text-base">
                Start Free Now
              </motion.button>
              <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto px-10 py-4 sm:py-5 bg-white/[0.04] hover:bg-white/[0.08]
                           border border-white/[0.1] hover:border-white/[0.2] font-bold rounded-2xl
                           backdrop-blur-sm transition-all duration-300 text-base">
                Book a Demo
              </motion.button>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── Footer ── */}
      <footer className="py-16 sm:py-20 px-4 sm:px-6 border-t border-white/[0.05] bg-[#020810]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-12 mb-12 sm:mb-16 text-sm">
          <div className="col-span-2 space-y-5">
            <div className="flex items-center gap-2.5">
              <AppIcon size={28} />
              <span className="text-base font-bold"><span className="text-teal-400">.</span>connect</span>
            </div>
            <p className="text-slate-600 max-w-[240px] leading-relaxed text-[13px]">
              Redefining communication for modern teams. Built with speed, privacy, and design at the core.
            </p>
          </div>
          {["Product", "Company", "Legal"].map((cat) => (
            <div key={cat} className="space-y-4">
              <h5 className="font-bold text-[11px] uppercase tracking-[0.18em] text-slate-500">{cat}</h5>
              <ul className="space-y-2.5 text-slate-600 text-[13px]">
                {["Overview", "Security", "Contact"].map(item => (
                  <li key={item} className="hover:text-teal-400 cursor-pointer transition-colors duration-200">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-center gap-4 text-[12px] text-slate-700">
          <p>© {currentYear} .connect Inc. All rights reserved.</p>
          <div className="flex gap-6 sm:gap-8">
            {["Twitter / X", "Discord", "LinkedIn"].map(s => (
              <span key={s} className="hover:text-slate-400 cursor-pointer transition-colors duration-200">{s}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

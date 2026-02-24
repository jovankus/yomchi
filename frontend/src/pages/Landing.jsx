import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Shield, Lock, FileText, Activity, Database, Users, ChevronRight, Server, Search, CheckCircle2, ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Landing = () => {
    const heroRef = useRef(null);
    const navRef = useRef(null);
    const featuresRef = useRef(null);
    const securityRef = useRef(null);
    const workflowRef = useRef(null);

    // Navbar Scroll Effect
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                navRef.current?.classList.add('bg-inst-panel/80', 'backdrop-blur-md', 'border-inst-border', 'border-b');
                navRef.current?.classList.remove('bg-transparent', 'border-transparent');
            } else {
                navRef.current?.classList.remove('bg-inst-panel/80', 'backdrop-blur-md', 'border-inst-border', 'border-b');
                navRef.current?.classList.add('bg-transparent', 'border-transparent');
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // GSAP Animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero fade up
            gsap.fromTo('.hero-anim',
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out', delay: 0.2 }
            );

            // Features Micro-software cards
            gsap.fromTo('.feature-card',
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0,
                    duration: 0.8, stagger: 0.2, ease: 'power2.out',
                    scrollTrigger: {
                        trigger: featuresRef.current,
                        start: 'top 80%',
                    }
                }
            );

            // Security monospace list
            gsap.fromTo('.security-line',
                { opacity: 0, x: -20 },
                {
                    opacity: 1, x: 0,
                    duration: 0.6, stagger: 0.1, ease: 'power2.out',
                    scrollTrigger: {
                        trigger: securityRef.current,
                        start: 'top 75%',
                    }
                }
            );

            // Workflow Sticky Stack
            const workflowCards = gsap.utils.toArray('.workflow-card');
            workflowCards.forEach((card, i) => {
                ScrollTrigger.create({
                    trigger: card,
                    start: `top top+=${100 + (i * 20)}`,
                    endTrigger: workflowRef.current,
                    end: "bottom bottom",
                    pin: true,
                    pinSpacing: false,
                });
            });

        });

        return () => ctx.revert();
    }, []);

    // Interactive States for Micro-software demos
    const [doctorCuts, setDoctorCuts] = useState(20000);
    const [cutPercent, setCutPercent] = useState(20);

    // Simulated accounting animation
    useEffect(() => {
        const interval = setInterval(() => {
            setCutPercent(prev => prev === 20 ? 10 : 20);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-inst-bg text-inst-text font-sans overflow-x-hidden selection:bg-inst-primary selection:text-white">
            {/* NOISE OVERLAY is handled globally in index.html, but we can add subtle radial gradients here */}
            <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-inst-primary/10 via-inst-bg to-inst-bg z-[-1]"></div>

            {/* A. NAVBAR — Institutional Floating Command Bar */}
            <header ref={navRef} className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-inst-primary flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-heading font-semibold text-xl tracking-tight text-white">Yomchi Healthcare</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-inst-muted">
                        <a href="#platform" className="hover:text-white transition-colors">Platform</a>
                        <a href="#security" className="hover:text-white transition-colors">Security</a>
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                    </nav>
                    <div>
                        <Link to="/clinic-login" className="px-5 py-2.5 rounded-full bg-inst-panel-secondary border border-inst-border text-white text-sm font-medium hover:bg-inst-border hover:border-inst-primary transition-all shadow-[0_0_15px_rgba(124,58,237,0.15)] hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                            Deploy Clinic Portal
                        </Link>
                    </div>
                </div>
            </header>

            {/* B. HERO — Institutional Authority */}
            <section ref={heroRef} className="relative min-h-[100dvh] pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center overflow-hidden">
                {/* Background graphic */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-inst-primary/10 bg-inst-primary/5 blur-3xl -z-10"></div>

                <div className="max-w-4xl mx-auto z-10">
                    <div className="hero-anim inline-flex items-center gap-2 px-3 py-1 rounded-full bg-inst-panel border border-inst-border text-xs font-mono text-inst-primary mb-8">
                        <span className="w-2 h-2 rounded-full bg-inst-success animate-pulse"></span>
                        SYSTEM OPERATIONAL
                    </div>

                    <h1 className="hero-anim text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[1.1] mb-8">
                        <span className="font-sans font-bold text-white block">Secure Clinics.</span>
                        <span className="font-heading font-light italic text-transparent bg-clip-text bg-gradient-to-r from-inst-text to-inst-primary/80">Powered by Precision.</span>
                    </h1>

                    <p className="hero-anim text-lg md:text-xl text-inst-muted max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                        The secure psychiatric infrastructure for modern clinics. Institutional-grade role-based access, automated accounting logic, and encrypted clinical documentation logic.
                    </p>

                    <div className="hero-anim flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/clinic-login" className="px-8 py-4 rounded-full bg-inst-primary text-white font-medium hover:bg-inst-primary-hover transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                            Access Command Center <ChevronRight className="w-4 h-4" />
                        </Link>
                        <a href="#features" className="px-8 py-4 rounded-full bg-transparent border border-inst-border text-white font-medium hover:bg-inst-panel transition-all">
                            View System Architecture
                        </a>
                    </div>
                </div>

                {/* Dashboard abstract preview */}
                <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-full max-w-6xl h-[40vh] bg-inst-panel border border-inst-border rounded-t-3xl hero-anim opacity-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
                    <div className="h-8 border-b border-inst-border flex items-center px-4 gap-2">
                        <div className="w-3 h-3 rounded-full bg-inst-border"></div>
                        <div className="w-3 h-3 rounded-full bg-inst-border"></div>
                        <div className="w-3 h-3 rounded-full bg-inst-border"></div>
                    </div>
                    <div className="flex-1 p-6 grid grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-4">
                            <div className="h-32 bg-inst-panel-secondary rounded-xl border border-inst-border/50"></div>
                            <div className="h-20 bg-inst-panel-secondary rounded-xl border border-inst-border/50"></div>
                        </div>
                        <div className="space-y-4">
                            <div className="h-16 bg-inst-panel-secondary rounded-xl border border-inst-border/50"></div>
                            <div className="h-16 bg-inst-panel-secondary rounded-xl border border-inst-border/50"></div>
                            <div className="h-16 bg-inst-panel-secondary rounded-xl border border-inst-border/50"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* C. SYSTEM FEATURES — Working Micro-software */}
            <section id="features" ref={featuresRef} className="py-32 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-20 text-center">
                        <h2 className="text-3xl md:text-5xl font-heading font-medium tracking-tight mb-4">Core Strengths</h2>
                        <p className="text-inst-muted">Precision medical architecture for institutional workflows.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Card 1: Role-Based Access Matrix */}
                        <div className="feature-card group flex flex-col bg-inst-panel border border-inst-border rounded-[2rem] p-8 hover:border-inst-primary/50 hover:shadow-[0_0_30px_rgba(124,58,237,0.1)] transition-all overflow-hidden relative">
                            <div className="w-12 h-12 rounded-2xl bg-inst-primary/10 flex items-center justify-center mb-6">
                                <Lock className="w-6 h-6 text-inst-primary" />
                            </div>
                            <h3 className="text-xl font-heading font-medium mb-3">Segmented Access</h3>
                            <p className="text-sm text-inst-muted mb-8 leading-relaxed">Cryptographically secured roles. From full administrative oversight to localized clinical entry.</p>

                            {/* Animated Visual */}
                            <div className="mt-auto bg-inst-bg rounded-xl border border-inst-border p-4 h-48 relative overflow-hidden flex flex-col justify-center gap-2">
                                <div className="flex items-center justify-between p-2 rounded bg-inst-panel-secondary border border-inst-primary/20 group-hover:bg-inst-primary/10 transition-colors">
                                    <span className="font-mono text-xs text-white">ADMIN</span>
                                    <span className="font-mono text-[10px] text-inst-success">FULL_ACCESS</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-inst-panel-secondary border border-inst-border opacity-70">
                                    <span className="font-mono text-xs text-inst-muted">SR_DOCTOR</span>
                                    <span className="font-mono text-[10px] text-inst-primary">CLINICAL_READ</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-inst-panel-secondary border border-inst-border opacity-50">
                                    <span className="font-mono text-xs text-inst-muted">SECRETARY</span>
                                    <span className="font-mono text-[10px] text-inst-warning">APPT_ONLY</span>
                                </div>
                                {/* Scanning line */}
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-inst-primary/50 shadow-[0_0_10px_#7C3AED] group-hover:translate-y-48 transition-transform duration-[3s] ease-linear repeat-infinite"></div>
                            </div>
                        </div>

                        {/* Card 2: Doctor Cut Intelligence */}
                        <div className="feature-card group flex flex-col bg-inst-panel border border-inst-border rounded-[2rem] p-8 hover:border-inst-primary/50 hover:shadow-[0_0_30px_rgba(124,58,237,0.1)] transition-all overflow-hidden">
                            <div className="w-12 h-12 rounded-2xl bg-inst-primary/10 flex items-center justify-center mb-6">
                                <Activity className="w-6 h-6 text-inst-primary" />
                            </div>
                            <h3 className="text-xl font-heading font-medium mb-3">Accounting Logic</h3>
                            <p className="text-sm text-inst-muted mb-8 leading-relaxed">Automated revenue tracking. First-visit vs follow-up percentages calculated instantaneously.</p>

                            {/* Animated Visual */}
                            <div className="mt-auto bg-inst-bg rounded-xl border border-inst-border p-5 h-48 font-mono flex flex-col justify-between">
                                <div>
                                    <div className="text-[10px] text-inst-muted mb-1">SESSION DETECTED</div>
                                    <div className="flex justify-between items-center bg-inst-panel-secondary p-2 rounded">
                                        <span className="text-xs text-white">Online Session</span>
                                        <span className="text-xs text-inst-success border border-inst-success/20 bg-inst-success/10 px-1.5 py-0.5 rounded">20,000 IQD</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-inst-muted mb-1">COMPUTED CUT</div>
                                    <div className="flex justify-between items-end border-t border-inst-border pt-4">
                                        <div>
                                            <span className="text-xs text-inst-primary block mb-1">{cutPercent === 20 ? 'First Visit' : 'Follow Up'}</span>
                                            <span className="text-sm font-bold text-white transition-all">{cutPercent}%</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-2xl text-white font-bold transition-all">
                                                {(20000 * (cutPercent / 100)).toLocaleString()} <span className="text-sm text-inst-muted">IQD</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Secure Prescription Engine */}
                        <div className="feature-card group flex flex-col bg-inst-panel border border-inst-border rounded-[2rem] p-8 hover:border-inst-primary/50 hover:shadow-[0_0_30px_rgba(124,58,237,0.1)] transition-all overflow-hidden">
                            <div className="w-12 h-12 rounded-2xl bg-inst-primary/10 flex items-center justify-center mb-6">
                                <FileText className="w-6 h-6 text-inst-primary" />
                            </div>
                            <h3 className="text-xl font-heading font-medium mb-3">Prescription Engine</h3>
                            <p className="text-sm text-inst-muted mb-8 leading-relaxed">A5 formatted generation with encrypted archival directly to Cloudflare R2 bucket storage.</p>

                            {/* Animated Visual */}
                            <div className="mt-auto bg-inst-bg rounded-xl border border-inst-border p-4 h-48 relative flex items-center justify-center">
                                {/* Simulated Document */}
                                <div className="w-[120px] h-[160px] bg-white rounded shadow-md p-3 relative group-hover:scale-105 transition-transform">
                                    <div className="w-full flex justify-between mb-4 border-b pb-1">
                                        <div className="w-10 h-1 bg-gray-300 rounded"></div>
                                        <div className="w-6 h-1 bg-gray-300 rounded"></div>
                                    </div>
                                    {/* Drugs Box */}
                                    <div className="w-full h-16 border-l-2 border-green-500 pl-2 space-y-2 mt-4">
                                        <div className="w-full h-1.5 bg-gray-800 rounded"></div>
                                        <div className="w-3/4 h-1.5 bg-gray-800 rounded"></div>
                                    </div>
                                </div>
                                {/* Upload simulation overlay */}
                                <div className="absolute inset-x-8 bottom-6 h-8 bg-inst-panel/90 backdrop-blur rounded border border-inst-primary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 delay-100">
                                    <span className="font-mono text-[10px] text-inst-primary flex items-center gap-1">
                                        <Server className="w-3 h-3" /> Syncing to R2...
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* D. SECURITY SECTION — Monospace data-style */}
            <section id="security" ref={securityRef} className="py-24 border-y border-inst-border bg-[#0B0613]/50 relative">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-heading font-medium tracking-tight mb-8">
                            Most clinics operate on fragile spreadsheets.<br />
                            <span className="text-inst-primary">We operate on protected infrastructure.</span>
                        </h2>
                        <div className="space-y-4 font-mono text-sm text-inst-muted">
                            <div className="security-line flex gap-4 p-4 border border-inst-border bg-inst-panel rounded-xl">
                                <span className="text-white">&gt; STORAGE</span>
                                <span>Encrypted Cloudflare R2 Buckets</span>
                            </div>
                            <div className="security-line flex gap-4 p-4 border border-inst-border bg-inst-panel rounded-xl">
                                <span className="text-white">&gt; AUTH</span>
                                <span>Zero-Trust Role Segmentation Check</span>
                            </div>
                            <div className="security-line flex gap-4 p-4 border border-inst-border bg-inst-panel rounded-xl">
                                <span className="text-white">&gt; AUDIT</span>
                                <span>Immutable Financial Event Log</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative h-full min-h-[400px] border border-inst-border rounded-3xl bg-inst-panel overflow-hidden flex flex-col">
                        <div className="h-10 border-b border-inst-border flex items-center px-4 bg-inst-bg">
                            <span className="font-mono text-xs text-inst-muted">system_logs.sh</span>
                        </div>
                        <div className="p-6 font-mono text-[11px] leading-relaxed text-inst-muted">
                            <div className="animate-pulse mb-2 text-inst-success">Connection established to PostgreSQL secure pool.</div>
                            <div>[2026-02-24T06:12:00Z] INIT Clinic authentication... OK</div>
                            <div>[2026-02-24T06:12:01Z] CHECK session token validity... VERIFIED</div>
                            <div>[2026-02-24T06:12:01Z] LOAD patient_id=9832... OK</div>
                            <div className="text-white mt-4">[ENCRYPTED BLOB]</div>
                            <div className="blur-[2px]">0x3F8A...A9B2 clinical notes block accessed</div>
                            <div className="mt-4">[2026-02-24T06:45:00Z] SYNC Financial Cut 20%... COMMITTED</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* E. WORKFLOW STACK />} */}
            <section ref={workflowRef} className="py-32 px-6 relative h-[250vh]">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-32">
                        <h2 className="text-3xl md:text-5xl font-heading font-medium tracking-tight">Clinical Workflow</h2>
                    </div>

                    <div className="relative">
                        {/* Card 1 */}
                        <div className="workflow-card w-full mb-10 bg-inst-panel border border-inst-border rounded-[2rem] p-10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10 flex gap-8 items-center justify-between">
                            <div>
                                <span className="font-mono text-xs text-inst-primary mb-2 block">PHASE 01</span>
                                <h3 className="text-3xl font-heading mb-4 text-white">Patient Intake</h3>
                                <p className="text-inst-muted max-w-sm">Swift registration with ASD profile integration, standardizing data from the moment they enter the clinic.</p>
                            </div>
                            <div className="hidden md:flex w-32 h-32 rounded-full border border-inst-border bg-inst-panel-secondary items-center justify-center">
                                <Users className="w-10 h-10 text-inst-muted" />
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="workflow-card w-full mb-10 bg-[#150C24] border border-[#351C52] rounded-[2rem] p-10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 flex gap-8 items-center justify-between mt-[-50px]">
                            <div>
                                <span className="font-mono text-xs text-white mb-2 block">PHASE 02</span>
                                <h3 className="text-3xl font-heading mb-4 text-white">Clinical Docs</h3>
                                <p className="text-inst-muted max-w-sm">From multi-visit psychiatric forms to prescription overrides. Encrypted and tied to the practitioner.</p>
                            </div>
                            <div className="hidden md:flex w-32 h-32 rounded-full border border-[#351C52] bg-[#1E1133] items-center justify-center">
                                <Database className="w-10 h-10 text-white" />
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="workflow-card w-full bg-[#1C0F2E] border border-inst-primary/40 rounded-[2rem] p-10 shadow-[0_-20px_40px_rgba(124,58,237,0.15)] z-30 flex gap-8 items-center justify-between mt-[-50px]">
                            <div>
                                <span className="font-mono text-xs text-inst-primary mb-2 block">PHASE 03</span>
                                <h3 className="text-3xl font-heading mb-4 text-white">Accounting & Reporting</h3>
                                <p className="text-inst-primary max-w-sm">End-of-day reconciliation out-of-the-box. Intelligent doctor cuts and inventory dispense tracking.</p>
                            </div>
                            <div className="hidden md:flex w-32 h-32 rounded-full border border-inst-primary/40 bg-inst-primary/20 items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-inst-primary" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* F. DEPLOY / ACCESS SECTION */}
            <section className="py-32 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-inst-panel border border-inst-primary/30 rounded-[3rem] p-16 text-center relative overflow-hidden flex flex-col items-center shadow-[0_0_60px_rgba(124,58,237,0.1)]">
                        <div className="absolute inset-0 bg-gradient-to-t from-inst-primary/10 to-transparent pointer-events-none"></div>
                        <Shield className="w-16 h-16 text-inst-primary mb-8" />
                        <h2 className="text-4xl md:text-5xl font-heading font-medium text-white mb-6">Deploy Yomchi Healthcare</h2>
                        <p className="text-xl text-inst-muted mb-10 max-w-lg">For your clinic today. Institutional-grade operations, available immediately.</p>
                        <Link to="/clinic-login" className="px-10 py-5 rounded-full bg-inst-primary text-white font-medium hover:bg-inst-primary-hover transition-all text-lg shadow-[0_0_20px_rgba(124,58,237,0.4)]">
                            Launch Secure Portal
                        </Link>
                    </div>
                </div>
            </section>

            {/* G. FOOTER */}
            <footer className="bg-[#050309] pt-20 pb-10 border-t border-inst-border rounded-t-[3rem]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <Shield className="w-5 h-5 text-inst-primary" />
                                <span className="font-heading font-semibold text-white">Yomchi</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-xs text-inst-muted bg-inst-panel w-fit px-3 py-1.5 rounded-md border border-inst-border">
                                <span className="w-2 h-2 rounded-full bg-inst-success animate-pulse"></span>
                                System Operational
                            </div>
                        </div>
                        <div>
                            <h4 className="font-heading font-medium text-white mb-4">Platform</h4>
                            <ul className="space-y-3 text-sm text-inst-muted">
                                <li>Intake System</li>
                                <li>Accounting Engine</li>
                                <li>Prescription Gen</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-heading font-medium text-white mb-4">Security</h4>
                            <ul className="space-y-3 text-sm text-inst-muted">
                                <li>RBAC Architecture</li>
                                <li>Encryption Keys</li>
                                <li>Audit Logs</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-heading font-medium text-white mb-4">Legal</h4>
                            <ul className="space-y-3 text-sm text-inst-muted">
                                <li>Data Processing</li>
                                <li>Terms of Service</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-inst-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-inst-muted font-mono">© 2026 Yomchi Healthcare Infrastructure.</p>
                        <p className="text-xs text-inst-muted font-mono">React 19 • Tailwind 3.4 • GSAP 3</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;

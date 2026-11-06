import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { useUi } from "@/context/ui";
import { useUsers } from "@/hooks/useApi";
import { toast } from "@/context/toast";
import { Icon } from "@/components/Icon";
import { LOGO } from "@/components/TopBar";

const PHRASES = ["Run your restaurant", "Take every order", "Keep the kitchen moving"];
const MARQUEE = [
    "Table & floor plans",
    "QR ordering for guests",
    "Live kitchen display",
    "Bills & payments",
    "Reservations",
    "Takeout & pickup",
];

/** Cycles a typed headline so the hero feels alive. Respects reduced motion by showing the first phrase. */
function useTyped() {
    const [text, setText] = useState("");
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setText(PHRASES[0]);
            return;
        }
        let i = 0,
            n = 0,
            del = false;
        const id = window.setInterval(() => {
            const full = PHRASES[i];
            n += del ? -1 : 1;
            setText(full.slice(0, n));
            if (!del && n === full.length) {
                del = true;
                n = full.length + 12;
            } else if (del && n <= 0) {
                del = false;
                n = 0;
                i = (i + 1) % PHRASES.length;
            }
        }, 70);
        return () => window.clearInterval(id);
    }, []);
    return text.slice(
        0,
        PHRASES.reduce((m, p) => Math.max(m, p.length), 0),
    );
}

function greeting() {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function LoginPage() {
    const users = useUsers().data;
    const typed = useTyped();
    const [id, setId] = useState("");
    const [pw, setPw] = useState("");
    const [show, setShow] = useState(false);
    const [keep, setKeep] = useState(true);
    const [err, setErr] = useState("");

    const enter = (u: { id: string; name: string }) => {
        useUi.setState({ meId: u.id, signedOut: false, view: "dashboard" });
        router.visit("/dashboard");
        toast(`Welcome back, ${u.name.split(" ")[0]}`);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const key = id.trim().toLowerCase();
        // Mock auth: match username or email, any non-empty password. The real check belongs to the backend.
        const u = users.find(
            (x) => x.active && (x.username.toLowerCase() === key || (x.email ?? "").toLowerCase() === key),
        );
        if (!key || !pw) return setErr("Enter your email or username and your password.");
        if (!u) return setErr("No active account matches that email or username.");
        setErr("");
        enter(u);
    };

    return (
        <main className="login">
            <section className="login-hero" aria-hidden="false">
                <div className="lg-brand">
                    {LOGO}
                    <div>
                        <strong>FBS Serve</strong>
                        <span>Restaurant Management System</span>
                        <em>Simple, fast, and smarter service.</em>
                    </div>
                </div>
                <span className="lg-chip">
                    <Icon name="sparkle" size={16} />
                    Built for busy dining rooms
                </span>
                <h1 className="lg-h">
                    {typed}
                    <i className="lg-caret" />
                    <br />
                    without the paper tickets.
                </h1>
                <p className="lg-sub">
                    Orders, kitchen, tables, reservations and bills in one place, with QR ordering for your guests.
                </p>
                <div className="lg-cards" aria-hidden="true">
                    <div className="lg-card main">
                        <small>TABLE 4 · DINE-IN</small>
                        <b>₱0</b>
                        <span>Ready to take orders for 12 tables</span>
                        <div className="lg-bar" />
                        <div className="lg-grid">
                            <span>Orders</span>
                            <span>Kitchen</span>
                            <span>Serving</span>
                            <span>Payment</span>
                        </div>
                    </div>
                    <div className="lg-card pill">
                        <span className="lg-pi">
                            <Icon name="receipt" size={22} />
                        </span>
                        <div>
                            <small>Bill · Table 2</small>
                            <b>₱1,240.00</b>
                        </div>
                    </div>
                    <div className="lg-card pill alt">
                        <span className="lg-pi">
                            <Icon name="table" size={22} />
                        </span>
                        <div>
                            <small>Tables in use</small>
                            <b>
                                8 <em>/ 12</em>
                            </b>
                        </div>
                    </div>
                </div>
                <div className="lg-marquee" aria-hidden="true">
                    <div>
                        {[...MARQUEE, ...MARQUEE].map((m, i) => (
                            <span key={i}>
                                {m}
                                <Icon name="sparkle" size={14} />
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="login-side">
                <button
                    type="button"
                    className="lg-back"
                    onClick={() => toast("Back to home is not available in the demo")}
                >
                    <Icon name="arrowr" size={16} />
                    Back to home
                </button>
                <span className="lg-ver">v1.0.0</span>
                <form className="lg-form" onSubmit={submit} noValidate>
                    <h2>{greeting()}, welcome back!</h2>
                    <p>Log in to your FBS Serve account to continue.</p>

                    <label htmlFor="lg-id">Email or username</label>
                    <div className="lg-field">
                        <Icon name="mail" size={20} />
                        <input
                            id="lg-id"
                            autoComplete="username"
                            placeholder="Enter your email or username"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                        />
                    </div>

                    <label htmlFor="lg-pw">Password</label>
                    <div className="lg-field">
                        <Icon name="lock" size={20} />
                        <input
                            id="lg-pw"
                            type={show ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                        />
                        <button
                            type="button"
                            className="lg-eye"
                            aria-label={show ? "Hide password" : "Show password"}
                            onClick={() => setShow((s) => !s)}
                        >
                            <Icon name={show ? "eyeoff" : "eye"} size={20} />
                        </button>
                    </div>

                    {err && (
                        <div className="lg-err" role="alert">
                            {err}
                        </div>
                    )}

                    <div className="lg-row">
                        <label className="lg-keep">
                            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
                            <span aria-hidden="true">
                                <Icon name="check" size={14} />
                            </span>
                            Keep me signed in
                        </label>
                        <button
                            type="button"
                            className="lg-link"
                            onClick={() => toast("Ask an admin to reset your password")}
                        >
                            Forgot password?
                        </button>
                    </div>

                    <button type="submit" className="lg-btn">
                        <Icon name="arrowr" size={18} />
                        Log In
                    </button>
                    <div className="lg-or">
                        <span>or</span>
                    </div>
                    <button
                        type="button"
                        className="lg-btn ghost"
                        onClick={() => toast("Google sign-in is not set up yet")}
                    >
                        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                            <path
                                fill="#EA4335"
                                d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"
                            />
                            <path
                                fill="#4285F4"
                                d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z"
                            />
                            <path
                                fill="#34A853"
                                d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"
                            />
                        </svg>
                        Sign in with Google
                    </button>
                    <p className="lg-safe">
                        <Icon name="shield" size={16} />
                        Your data is safe with us.
                    </p>
                    <div className="lg-demo" role="group" aria-label="Demo accounts">
                        <span>Demo accounts, click to sign in</span>
                        <div className="lg-accts">
                            {users.map((u) => (
                                <button
                                    key={u.id}
                                    type="button"
                                    className="lg-acct"
                                    disabled={!u.active}
                                    onClick={() => enter(u)}
                                    title={u.active ? `Sign in as ${u.name}` : "Inactive account"}
                                >
                                    <b>{u.role}</b>
                                    {!u.active && <small>inactive</small>}
                                </button>
                            ))}
                        </div>
                    </div>
                </form>
            </section>
        </main>
    );
}

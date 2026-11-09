import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/api-service";
import { useInvalidate, useRoles, useUsers } from "@/hooks/useApi";
import { useUi } from "@/context/ui";
import { toast } from "@/context/toast";
import { Icon } from "@/components/Icon";
import { initials } from "@/components/TopBar";
import type { User } from "@/types/restaurant";

/** The signed-in user's own page: photo, personal and contact details, and password. */
export default function ProfilePage() {
    const meId = useUi((s) => s.meId);
    const me = useUsers().data.find((u) => u.id === meId);
    const role = useRoles().data.find((r) => r.id === me?.role)?.name ?? "";
    if (!me) return null;
    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Profile</h1>
                    <p className="muted">Your photo, contact details and password.</p>
                </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
                <DetailsForm key={me.id} me={me} role={role} />
                <PasswordForm me={me} />
            </div>
        </>
    );
}

function DetailsForm({ me, role }: { me: User; role: string }) {
    const invalidate = useInvalidate();
    const [v, setV] = useState({
        name: me.name,
        email: me.email ?? "",
        phone: me.phone ?? "",
        address: me.address ?? "",
        avatar: me.avatar ?? "",
    });
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setV((x) => ({ ...x, [k]: e.target.value }));

    const pick = async (file?: File) => {
        if (!file) return;
        setUploading(true);
        try {
            const url = await api.uploads.image(file, "avatars");
            setV((x) => ({ ...x, avatar: url }));
        } catch (e) {
            toast(e instanceof Error ? e.message : "Could not upload the photo");
        } finally {
            setUploading(false);
        }
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy || uploading) return;
        setBusy(true);
        setErrors({});
        try {
            await api.admin.saveProfile(me.id, v);
            await invalidate("users");
            toast("Profile saved");
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(Object.fromEntries(Object.entries(err.errors ?? {}).map(([k, m]) => [k, m[0]])));
                toast(err.message);
            } else toast("Could not save your profile");
        } finally {
            setBusy(false);
        }
    };
    const err = (k: string) =>
        errors[k] ? (
            <span className="hint bad" id={`pf-${k}-err`}>
                {errors[k]}
            </span>
        ) : null;

    return (
        <form className="card grid gap-5" onSubmit={save} noValidate>
            <section className="grid gap-3">
                <h3>Photo</h3>
                <div className="flex flex-wrap items-center gap-4">
                    {v.avatar ? (
                        <img
                            src={v.avatar}
                            alt="Your photo"
                            className="size-24 rounded-full object-cover bg-[var(--surface-sunken)]"
                        />
                    ) : (
                        <span
                            className="avatar size-24! text-[28px]! cursor-default!"
                            aria-label="No photo yet"
                            role="img"
                        >
                            {initials(v.name || me.name)}
                        </span>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn btn-outline"
                            disabled={uploading}
                            onClick={() => fileRef.current?.click()}
                        >
                            <Icon name="plus" size={18} />
                            {uploading ? "Uploading…" : v.avatar ? "Change photo" : "Upload photo"}
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                                pick(e.target.files?.[0]);
                                e.target.value = "";
                            }}
                        />
                        {v.avatar ? (
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setV((x) => ({ ...x, avatar: "" }))}
                            >
                                Remove
                            </button>
                        ) : null}
                    </div>
                </div>
                <span className="hint text-[12px]! leading-4!">PNG, JPG or WEBP. It shows in the top bar.</span>
            </section>

            <section className="grid gap-3">
                <h3>Personal Details</h3>
                <label className="field">
                    <span>Full name</span>
                    <input
                        className="input"
                        value={v.name}
                        onChange={set("name")}
                        required
                        maxLength={60}
                        autoComplete="name"
                        aria-invalid={!!errors.name}
                    />
                    {err("name")}
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="field">
                        <span>Username</span>
                        <input className="input" value={me.username} disabled />
                    </label>
                    <label className="field">
                        <span>Role</span>
                        <input className="input" value={role} disabled />
                    </label>
                </div>
                <span className="hint text-[12px]! leading-4!">
                    An Admin changes the username and role in Settings.
                </span>
            </section>

            <section className="grid gap-3">
                <h3>Contact Details</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="field">
                        <span>Email</span>
                        <input
                            className="input"
                            type="email"
                            value={v.email}
                            onChange={set("email")}
                            maxLength={255}
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                        />
                        {err("email")}
                    </label>
                    <label className="field">
                        <span>Contact number</span>
                        <input
                            className="input num"
                            type="tel"
                            inputMode="tel"
                            value={v.phone}
                            onChange={set("phone")}
                            maxLength={30}
                            placeholder="0917 555 0101"
                            autoComplete="tel"
                            aria-invalid={!!errors.phone}
                        />
                        {err("phone")}
                    </label>
                </div>
                <label className="field">
                    <span>Address</span>
                    <textarea
                        className="input"
                        rows={3}
                        value={v.address}
                        onChange={set("address")}
                        maxLength={255}
                        placeholder="House no., street, barangay, city"
                        autoComplete="street-address"
                        aria-invalid={!!errors.address}
                    />
                    {err("address")}
                </label>
            </section>

            <div className="flex justify-end">
                <button className="btn btn-primary" disabled={busy || uploading}>
                    {uploading ? "Uploading photo…" : busy ? "Saving…" : "Save profile"}
                </button>
            </div>
        </form>
    );
}

function PasswordForm({ me }: { me: User }) {
    const invalidate = useInvalidate();
    const [cur, setCur] = useState(""),
        [next, setNext] = useState(""),
        [again, setAgain] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => setError(""), [cur, next, again]);
    const mismatch = again !== "" && next !== again;

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        if (next.length < 8) return setError("Use at least 8 characters.");
        if (next !== again) return setError("The new passwords do not match.");
        setBusy(true);
        try {
            await api.admin.changePassword(me.id, cur, next, again);
            await invalidate("users");
            setCur("");
            setNext("");
            setAgain("");
            toast(me.hasPassword ? "Password changed" : "Password set");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not change the password");
        } finally {
            setBusy(false);
        }
    };

    return (
        <form className="card grid gap-3" onSubmit={save} noValidate>
            <h3>{me.hasPassword ? "Change Password" : "Set a Password"}</h3>
            {me.hasPassword ? (
                <label className="field">
                    <span>Current password</span>
                    <input
                        className="input"
                        type="password"
                        value={cur}
                        onChange={(e) => setCur(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </label>
            ) : (
                <p className="caption muted">You have no password yet. Set one here.</p>
            )}
            <label className="field">
                <span>New password</span>
                <input
                    className="input"
                    type="password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    aria-describedby="pw-hint"
                />
                <span className="hint text-[12px]! leading-4!" id="pw-hint">
                    At least 8 characters.
                </span>
            </label>
            <label className="field">
                <span>Confirm new password</span>
                <input
                    className="input"
                    type="password"
                    value={again}
                    onChange={(e) => setAgain(e.target.value)}
                    autoComplete="new-password"
                    required
                    aria-invalid={mismatch}
                />
                {mismatch ? (
                    <span className="hint bad text-[12px]! leading-4!">The passwords do not match.</span>
                ) : null}
            </label>
            {error ? (
                <div className="alert warn" role="alert">
                    <Icon name="alert" />
                    <p>{error}</p>
                </div>
            ) : null}
            <div className="flex justify-end">
                <button className="btn btn-primary" disabled={busy || !next || !again || (me.hasPassword && !cur)}>
                    {busy ? "Saving…" : me.hasPassword ? "Change password" : "Set password"}
                </button>
            </div>
        </form>
    );
}

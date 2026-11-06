import { useState } from "react";
import type { User } from "@/types/restaurant";
import { api } from "@/api-service";
import { useInvalidate } from "@/hooks/useApi";
import { closeModal } from "@/context/modal";
import { toast } from "@/context/toast";

export function ProfileModal({ user, role }: { user: User; role: string }) {
    const invalidate = useInvalidate();
    const [name, setName] = useState(user.name);
    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await api.admin.updateProfile(user.id, { name: name.trim() });
        await invalidate("users");
        closeModal();
        toast("Profile saved");
    };
    return (
        <form onSubmit={save}>
            <div className="m-body">
                <label className="field">
                    <span>Full name</span>
                    <input name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
                </label>
                <label className="field">
                    <span>Username</span>
                    <input value={user.username} disabled />
                </label>
                <label className="field">
                    <span>Role</span>
                    <input value={role} disabled />
                </label>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary">Save</button>
            </div>
        </form>
    );
}

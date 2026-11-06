import { useRef, useState } from "react";
import { api } from "@/api-service";
import { useCategories, useInvalidate } from "@/hooks/useApi";
import { ApiError } from "@/api-service";
import { TAGS } from "@/lib/constants";
import type { Food, FoodStatus, FoodTag } from "@/types/restaurant";
import { Icon } from "@/components/Icon";
import { closeModal } from "@/context/modal";
import { toast } from "@/context/toast";

interface VDraft {
    id: string;
    name: string;
    price: string;
}

export function FoodForm({ food }: { food: Food | null }) {
    const cats = useCategories().data;
    const invalidate = useInvalidate();
    const n = !food;
    const [name, setName] = useState(food?.name ?? "");
    const [cat, setCat] = useState(food?.cat ?? "");
    const [price, setPrice] = useState(food ? String(food.price) : "");
    const [eta, setEta] = useState(String(food?.eta ?? 15));
    const [desc, setDesc] = useState(food?.desc ?? "");
    const [status, setStatus] = useState<FoodStatus>(food?.status ?? "available");
    const [tags, setTags] = useState<FoodTag[]>(food?.tags ?? []);
    const [photos, setPhotos] = useState<string[]>(food?.photos ?? []);
    const [vars, setVars] = useState<VDraft[]>(
        (food?.variants ?? []).map((v) => ({ id: v.id, name: v.name, price: String(v.price) })),
    );
    const lastName = useRef<HTMLDivElement>(null);
    const on = vars.length > 0;
    const low = Math.min(...vars.map((v) => +v.price).filter((x) => x > 0));
    const shownPrice = on && isFinite(low) ? String(low) : price;
    const catId = cat || cats[0]?.id || "";

    const setVar = (i: number, p: Partial<VDraft>) => setVars((vs) => vs.map((v, k) => (k === i ? { ...v, ...p } : v)));
    const addVar = () => {
        setVars((vs) => [...vs, { id: "", name: "", price: vs.length ? "" : shownPrice }]);
        setTimeout(() =>
            [...(lastName.current?.querySelectorAll<HTMLInputElement>("input[name=vname]") ?? [])].at(-1)?.focus(),
        );
    };
    const addPhotos = (files: FileList | null) => {
        [...(files ?? [])].forEach((file) => {
            const rd = new FileReader();
            rd.onload = () => setPhotos((p) => [...p, String(rd.result)]);
            rd.readAsDataURL(file);
        });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const input = {
            name,
            cat: catId,
            price: +price,
            eta: +eta,
            desc,
            status,
            tags,
            photos,
            variants: vars.map((v) => ({ id: v.id, name: v.name, price: +v.price })),
        };
        try {
            if (food) await api.catalog.updateFood(food.id, input);
            else await api.catalog.createFood(input);
        } catch (err) {
            if (err instanceof ApiError) return toast(err.message);
            throw err;
        }
        await invalidate("foods");
        closeModal();
        toast(food ? `${name.trim()} saved` : `${name.trim()} added to the menu`);
    };

    return (
        <form id="food-form" onSubmit={submit}>
            <div className="m-body">
                <div className="form-grid">
                    <label className="field full">
                        <span>Name</span>
                        <input
                            id="ff-name"
                            name="name"
                            className="input"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Chicken Inasal"
                        />
                    </label>
                    <label className="field">
                        <span>Category</span>
                        <select
                            id="ff-cat"
                            name="cat"
                            className="input"
                            value={catId}
                            onChange={(e) => setCat(e.target.value)}
                        >
                            {cats.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="field">
                        <span>Price (₱)</span>
                        <input
                            id="ff-price"
                            name="price"
                            className="input num"
                            type="number"
                            min="1"
                            step="0.01"
                            disabled={on}
                            required={!on}
                            value={shownPrice}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="245.00"
                        />
                        <span className="hint" id="ff-price-hint">
                            {on ? "Set by the lowest variant price." : "Add variants below if it comes in sizes."}
                        </span>
                    </label>
                    <label className="field">
                        <span>Prep time (minutes)</span>
                        <input
                            id="ff-eta"
                            name="eta"
                            className="input num"
                            type="number"
                            min="1"
                            max="180"
                            inputMode="numeric"
                            required
                            value={eta}
                            onChange={(e) => setEta(e.target.value)}
                        />
                        <span className="hint">Guests see this as the estimated wait.</span>
                    </label>
                    <label className="field full">
                        <span>Description</span>
                        <textarea
                            id="ff-desc"
                            name="desc"
                            className="input"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Ingredients in one line"
                        />
                    </label>
                    <div className="field full">
                        <span>
                            Variants <span className="muted">(optional)</span>
                        </span>
                        <div className="ff-variants" id="ff-variants" ref={lastName}>
                            {vars.map((v, i) => (
                                <div className="ff-var" key={i}>
                                    <input
                                        className="input"
                                        name="vname"
                                        required
                                        maxLength={30}
                                        value={v.name}
                                        onChange={(e) => setVar(i, { name: e.target.value })}
                                        placeholder="Large"
                                        aria-label={`Variant ${i + 1} name`}
                                    />
                                    <input
                                        className="input num"
                                        name="vprice"
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        required
                                        value={v.price}
                                        onChange={(e) => setVar(i, { price: e.target.value })}
                                        placeholder="Price"
                                        aria-label={`Variant ${i + 1} price`}
                                    />
                                    <button
                                        type="button"
                                        className="icon-btn danger"
                                        aria-label={`Remove variant ${i + 1}`}
                                        onClick={() => setVars((vs) => vs.filter((_, k) => k !== i))}
                                    >
                                        <Icon name="trash" />
                                    </button>
                                </div>
                            ))}
                            <button type="button" className="btn btn-outline" onClick={addVar}>
                                <Icon name="plus" size={20} />
                                Add variant
                            </button>
                        </div>
                        <span className="hint">
                            For sizes or portions, such as Small, Medium and Large for a pizza. Each variant has its own
                            price, and guests pick one when they order.
                        </span>
                    </div>
                    <div className="field full">
                        <span>Photos</span>
                        <div className="ff-photos" id="ff-photos">
                            {photos.map((src, i) => (
                                <div className="ff-photo" key={i}>
                                    <img src={src} alt={`Photo ${i + 1}`} />
                                    <button
                                        type="button"
                                        aria-label={`Remove photo ${i + 1}`}
                                        onClick={() => setPhotos((p) => p.filter((_, k) => k !== i))}
                                    >
                                        <Icon name="x" size={16} />
                                    </button>
                                </div>
                            ))}
                            <label className="ff-add">
                                <Icon name="plus" size={20} />
                                Add photos
                                <input
                                    id="ff-img"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        addPhotos(e.target.files);
                                        e.target.value = "";
                                    }}
                                />
                            </label>
                        </div>
                        <span className="hint">
                            The first photo is the cover. Guests can open all photos in a gallery.
                        </span>
                    </div>
                    <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
                        <span className="label">Status</span>
                        <div className="checks">
                            {(
                                [
                                    ["available", "Available"],
                                    ["unavailable", "Not available"],
                                ] as const
                            ).map(([v, l]) => (
                                <label className="check" key={v}>
                                    <input
                                        type="radio"
                                        name="status"
                                        value={v}
                                        checked={status === v}
                                        onChange={() => setStatus(v)}
                                    />
                                    {l}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
                        <span className="label">Menu tags</span>
                        <div className="checks">
                            {(Object.entries(TAGS) as [FoodTag, string][]).map(([k, l]) => (
                                <label className="check" key={k}>
                                    <input
                                        type="checkbox"
                                        name="tags"
                                        value={k}
                                        checked={tags.includes(k)}
                                        onChange={(e) =>
                                            setTags((t) => (e.target.checked ? [...t, k] : t.filter((x) => x !== k)))
                                        }
                                    />
                                    {l}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary">{n ? "Add food" : "Save changes"}</button>
            </div>
        </form>
    );
}

export function DeleteFood({ food }: { food: Food }) {
    const invalidate = useInvalidate();
    const ok = async () => {
        await api.catalog.deleteFood(food.id);
        await invalidate("foods");
        closeModal();
        toast(`${food.name} deleted`);
    };
    return (
        <>
            <div className="m-body">
                <p>
                    <b>{food.name}</b> will be removed from the menu. Past orders keep their record.
                </p>
            </div>
            <div className="m-foot">
                <button className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-danger" onClick={ok}>
                    <Icon name="trash" size={20} />
                    Delete food
                </button>
            </div>
        </>
    );
}

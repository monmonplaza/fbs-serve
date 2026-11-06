import { useEffect, useRef, useState } from "react";
import { useCategories, useFoods } from "@/hooks/useApi";
import type { Food } from "@/types/restaurant";
import { hasV } from "@/lib/domain";
import { peso } from "@/lib/format";
import { catName, EtaTag, FoodImage, FoodTags, PriceTag } from "@/lib/foodDisplay";
import { Icon } from "@/components/Icon";
import { usePaged } from "@/components/Pager";
import { RowActions } from "@/components/RowActions";
import { openModal } from "@/context/modal";
import { DeleteFood, FoodForm } from "@/components/foods/FoodModals";
import { openGallery } from "@/components/foods/Lightbox";

const FOOD_STEP = 8;
const HAS_IO = typeof IntersectionObserver !== "undefined";

const addFood = () => openModal({ title: "Add food", content: <FoodForm food={null} /> });
const editFood = (f: Food) => openModal({ title: `Edit ${f.name}`, content: <FoodForm food={f} /> });
const delFood = (f: Food) => openModal({ title: "Delete food?", content: <DeleteFood food={f} /> });

const Status = ({ f, icon }: { f: Food; icon?: boolean }) => (
    <span className={`pill ${f.status === "available" ? "p-ok" : "p-error"}`}>
        {icon && <Icon name={f.status === "available" ? "check" : "x"} size={16} />}
        {f.status === "available" ? "Available" : "Not available"}
    </span>
);

export default function FoodsPage() {
    const foods = useFoods().data,
        cats = useCategories().data;
    const [cat, setCat] = useState("all");
    const [view, setView] = useState<"card" | "table">("card");
    const [shown, setShown] = useState(FOOD_STEP);
    const list = foods.filter((f) => cat === "all" || f.cat === cat);
    const pg = usePaged(list, cat);
    const loading = useRef(false);
    const sentinel = useRef<HTMLDivElement>(null);
    const more = list.length > shown;

    const loadMore = () => {
        if (loading.current) return;
        loading.current = true;
        // A short pause so the spinner shows, like a feed fetching the next page.
        setTimeout(() => {
            loading.current = false;
            setShown((s) => s + FOOD_STEP);
        }, 350);
    };
    useEffect(() => {
        const el = sentinel.current;
        if (!HAS_IO || !el) return;
        const io = new IntersectionObserver(
            (es) => {
                if (es.some((e) => e.isIntersecting)) loadMore();
            },
            { rootMargin: "200px 0px" },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [more, view, shown, cat]);

    const pick = (k: string) => {
        setCat(k);
        setShown(FOOD_STEP);
    };
    const pickView = (v: "card" | "table") => {
        setView(v);
        setShown(FOOD_STEP);
    };
    const firstNew = list[shown];

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Foods</h1>
                    <p className="muted">The menu guests see when they scan a table QR.</p>
                </div>
                <button className="btn btn-primary" onClick={addFood}>
                    <Icon name="plus" size={20} />
                    Add food
                </button>
            </div>
            <div className="toolbar">
                <div className="chips" role="group" aria-label="Category">
                    {[{ id: "all", name: "All" }, ...cats].map((c) => (
                        <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => pick(c.id)}>
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="spacer" />
                <div className="seg" role="group" aria-label="View">
                    <button aria-pressed={view === "card"} onClick={() => pickView("card")}>
                        <Icon name="grid" size={20} />
                        Cards
                    </button>
                    <button aria-pressed={view === "table"} onClick={() => pickView("table")}>
                        <Icon name="list" size={20} />
                        Table
                    </button>
                </div>
            </div>
            {!list.length ? (
                <div className="card empty">
                    <Icon name="utensils" size={32} />
                    No foods in this category yet.
                    <button className="btn btn-primary" onClick={addFood}>
                        Add food
                    </button>
                </div>
            ) : view === "card" ? (
                <>
                    <div className="food-grid">
                        {list.slice(0, shown).map((f) => (
                            <article key={f.id} className={`fcard ${f.status !== "available" ? "unavail" : ""}`}>
                                <div className="fimg">
                                    <button
                                        className="photo-btn"
                                        aria-label={`View photos of ${f.name}`}
                                        onClick={() => openGallery(f)}
                                    >
                                        <FoodImage food={f} size={48} />
                                        {f.photos.length > 1 && (
                                            <span className="pcount">
                                                <Icon name="image" size={14} />
                                                {f.photos.length}
                                            </span>
                                        )}
                                    </button>
                                    <Status f={f} icon />
                                </div>
                                <div className="fbody">
                                    <span className="label muted">{catName(cats, f.cat)}</span>
                                    <div className="row">
                                        <h3>{f.name}</h3>
                                        <PriceTag food={f} />
                                    </div>
                                    <p className="muted">{f.desc}</p>
                                    <EtaTag food={f} />
                                    {hasV(f) && (
                                        <div className="vchips" aria-label="Variants">
                                            {f.variants.map((v) => (
                                                <span key={v.id} className="vchip">
                                                    {v.name} <b className="num">{peso(v.price)}</b>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div>
                                        <FoodTags tags={f.tags} />
                                    </div>
                                </div>
                                <div className="factions">
                                    <button id={`fe-${f.id}`} className="btn btn-outline" onClick={() => editFood(f)}>
                                        <Icon name="edit" size={20} />
                                        Edit
                                    </button>
                                    <button
                                        className="icon-btn danger"
                                        aria-label={`Delete ${f.name}`}
                                        onClick={() => delFood(f)}
                                    >
                                        <Icon name="trash" />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                    {more ? (
                        HAS_IO ? (
                            <div ref={sentinel} className="loadmore" role="status">
                                <span className="spin" aria-hidden="true" />
                                <span className="caption canvas-note">Loading more foods…</span>
                            </div>
                        ) : (
                            <div className="loadmore">
                                <button
                                    id="food-more"
                                    className="btn btn-outline"
                                    onClick={() => {
                                        setShown((s) => s + FOOD_STEP);
                                        // Move focus to the first new card so keyboard and screen reader users land on what was loaded.
                                        if (firstNew)
                                            requestAnimationFrame(() =>
                                                document.getElementById("fe-" + firstNew.id)?.focus(),
                                            );
                                    }}
                                >
                                    <Icon name="plus" size={20} />
                                    Load more
                                </button>
                            </div>
                        )
                    ) : list.length > FOOD_STEP ? (
                        <div className="loadmore">
                            <span className="caption canvas-note num" role="status">
                                That’s all {list.length} foods
                            </span>
                        </div>
                    ) : null}
                </>
            ) : (
                <>
                    <div className="tbl-scroll">
                        <table className="data">
                            <thead>
                                <tr>
                                    <th>Food</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Prep time</th>
                                    <th>Tags</th>
                                    <th>Status</th>
                                    <th className="r">Price</th>
                                    <th className="r">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pg.rows.map((f) => (
                                    <tr key={f.id}>
                                        <td>
                                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                                <div className="thumb">
                                                    <FoodImage food={f} size={20} />
                                                </div>
                                                <div>
                                                    <b>{f.name}</b>
                                                    {hasV(f) && (
                                                        <div className="caption muted">
                                                            {f.variants.map((v) => v.name).join(" · ")}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>{catName(cats, f.cat)}</td>
                                        <td className="muted" style={{ minWidth: 220 }}>
                                            {f.desc}
                                        </td>
                                        <td className="num" style={{ whiteSpace: "nowrap" }}>
                                            {f.eta} min
                                        </td>
                                        <td>
                                            {f.tags.length ? (
                                                <FoodTags tags={f.tags} />
                                            ) : (
                                                <span className="muted">None</span>
                                            )}
                                        </td>
                                        <td>
                                            <Status f={f} />
                                        </td>
                                        <td className="r num">
                                            {hasV(f) && <span className="caption muted">From </span>}
                                            <b>{peso(f.price)}</b>
                                        </td>
                                        <td className="r" style={{ whiteSpace: "nowrap" }}>
                                            <RowActions
                                                actions={[
                                                    {
                                                        ic: "edit",
                                                        label: "Edit",
                                                        aria: `Edit ${f.name}`,
                                                        onClick: () => editFood(f),
                                                    },
                                                    {
                                                        ic: "trash",
                                                        label: "Delete",
                                                        aria: `Delete ${f.name}`,
                                                        onClick: () => delFood(f),
                                                        danger: true,
                                                    },
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pg.bar}
                </>
            )}
        </>
    );
}

import { useCategories, useFoods } from "@/hooks/useApi";
import { useUi } from "@/context/ui";
import { TAGS } from "@/lib/constants";
import type { Food } from "@/types/restaurant";
import { Icon } from "@/components/Icon";
import { hasV } from "@/lib/domain";
import { FoodImage, PriceTag, EtaTag } from "@/lib/foodDisplay";
import { openGallery } from "@/components/foods/Lightbox";

/** The guest menu: category chips and the foods. Only available foods can be added. */
export function GuestMenu({ onAdd }: { onAdd: (f: Food) => void }) {
    const cats = useCategories().data,
        foods = useFoods().data;
    const cat = useUi((s) => s.guest.cat),
        setGuest = useUi((s) => s.setGuest);
    const chips: [string, string][] = [["all", "All"], ...cats.map((c): [string, string] => [c.id, c.name])];
    const list = foods.filter((f) => cat === "all" || f.cat === cat);
    return (
        <>
            <div className="g-cats">
                {chips.map(([k, l]) => (
                    <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setGuest({ cat: k })}>
                        {l}
                    </button>
                ))}
            </div>
            {list.map((f) => {
                const ok = f.status === "available";
                return (
                    <article key={f.id} className={`gfood ${ok ? "" : "unavail"}`}>
                        <button
                            className="gimg"
                            aria-label={`View photos of ${f.name}`}
                            onClick={() => openGallery(f, "phone")}
                        >
                            <FoodImage food={f} size={32} />
                            {f.photos.length > 1 && (
                                <span className="pcount">
                                    <Icon name="image" size={14} />
                                    {f.photos.length}
                                </span>
                            )}
                        </button>
                        <div className="info">
                            <div>
                                {f.tags.map((t) => (
                                    <span key={t} className={`tag tag-${t}`}>
                                        {TAGS[t]}{" "}
                                    </span>
                                ))}
                            </div>
                            <h4>{f.name}</h4>
                            <p className="caption muted">{f.desc}</p>
                            <EtaTag food={f} />
                            {hasV(f) && (
                                <span className="caption muted">{f.variants.map((v) => v.name).join(" · ")}</span>
                            )}
                            <div className="foot">
                                <PriceTag food={f} />
                                {ok ? (
                                    <button
                                        className="btn btn-primary btn-add"
                                        aria-label={`${hasV(f) ? "Choose an option for" : "Add"} ${f.name}${hasV(f) ? "" : " to plate"}`}
                                        onClick={() => onAdd(f)}
                                    >
                                        <Icon name="plus" size={18} />
                                        Add
                                    </button>
                                ) : (
                                    <span className="pill p-error">Not available</span>
                                )}
                            </div>
                        </div>
                    </article>
                );
            })}
        </>
    );
}

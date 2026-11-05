// Shared food display pieces: photo or placeholder, price, prep time, tags, category helpers.
import type { Category, Food, FoodTag } from '@/api/types';
import { useCategories } from '@/api/queries';
import { TAGS } from '@/api/constants';
import { Icon } from '@/components/Icon';
import { hasV } from './domain';
import { peso } from './format';

export const CAT_IC: Record<string, string> = { appetizer: 'bowl', main: 'utensils', drinks: 'cup', dessert: 'cake', sidedish: 'plate' };
export const catName = (cats: Category[], id: string) => cats.find(c => c.id === id)?.name || 'Uncategorized';
export const catIdx = (cats: Category[], id: string) => Math.max(0, cats.findIndex(c => c.id === id)) % 5;

/** First photo, or a tinted block with the category icon when the food has none. */
export function FoodImage({ food, size = 40 }: { food: Food; size?: number }) {
  const cats = useCategories().data;
  return food.photos[0]
    ? <img src={food.photos[0]} alt={food.name} />
    : <div className={`ph cat-${catIdx(cats, food.cat)}`} role="img" aria-label={`${food.name}, no photo yet`}><Icon name={CAT_IC[food.cat] || 'plate'} size={size} /></div>;
}

export function PriceTag({ food }: { food: Food }) {
  return <span className="price num">{hasV(food) && <span className="from">From</span>}{peso(food.price)}</span>;
}

export function EtaTag({ food }: { food: Food }) {
  return <span className="eta"><Icon name="clock" size={16} />About {food.eta} min</span>;
}

export function FoodTags({ tags }: { tags: FoodTag[] }) {
  return <>{tags.map((t, i) => <span key={t}>{i ? ' ' : ''}<span className={`tag tag-${t}`}>{TAGS[t]}</span></span>)}</>;
}

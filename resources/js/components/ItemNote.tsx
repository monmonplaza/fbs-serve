/** The guest's cooking request on an order item, shown under the item name (kitchen, bills, order tracking). */
export function ItemNote({ note }: { note?: string }) {
    if (!note) return null;
    return (
        <em className="inote">
            <b>Note:</b> {note}
        </em>
    );
}

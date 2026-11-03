export function BusinessSelector({ businesses, selectedId }: {
  businesses: { id: string; name: string }[]; selectedId: string;
}) {
  return <form method="get" action="/customers" className="flex flex-wrap items-end gap-3">
    <div><label htmlFor="selected-business" className="mb-1 block text-sm font-medium">Business</label>
      <select id="selected-business" name="businessId" defaultValue={selectedId} className="rounded-lg border border-slate-300 px-3 py-2">
        {businesses.map(business => <option key={business.id} value={business.id}>{business.name}</option>)}
      </select>
    </div>
    <button className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700">Open business</button>
  </form>;
}

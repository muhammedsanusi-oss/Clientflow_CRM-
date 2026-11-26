"use client";

import { useEffect, useState } from "react";
import type { WebsitePhotoDetails } from "../../../../../../packages/domain/src/website-content";

export type PhotoGroup = { key: string; label: string; photos: { ref: string; url: string }[] };
export function ProductPhotos({ groups, count, maxImages, publishedCount, disabled, uploading, details, resetKey, onDetails, onPriceValidity, onUpload, onMove, onReorder, onRemove }: {
  groups: PhotoGroup[]; count: number; maxImages: number | null; publishedCount: number; disabled: boolean; uploading: boolean;
  onUpload: (section: string, file: File) => void;
  onMove: (source: string, index: number, destination: string) => void;
  onReorder: (section: string, index: number, direction: number) => void;
  onRemove: (section: string, index: number) => void;
  details: WebsitePhotoDetails;
  resetKey: number;
  onDetails: (ref: string, value: WebsitePhotoDetails[string]) => void;
  onPriceValidity: (ref: string, valid: boolean) => void;
}) {
  const [selected, setSelected] = useState("offerings");
  const destination = groups.find(group => group.key === selected) ?? groups.find(group => group.key === "offerings")!;
  const atLimit = maxImages !== null && count >= maxImages;
  const mustPublishRemovals = maxImages !== null && publishedCount >= maxImages && count < maxImages;
  const overLimit = maxImages !== null && count > maxImages;
  return <section aria-labelledby="product-photos-title" className="photo-studio">
    <header className="photo-studio-heading"><div><span className="studio-eyebrow">YOUR LITTLE SHOWCASE</span><h2 id="product-photos-title">Product photos</h2>
      <p>Make a lovely first impression. Add photos, style them your way, and give your products a name and price.</p></div>
      <div className="photo-allowance"><p role="status" data-photo-allowance>{count} {maxImages === null ? "photos used" : `of ${maxImages} photos used · ${Math.max(0, maxImages - count)} remaining`}</p>
      {maxImages !== null && <progress aria-label="Website photo allowance" value={Math.min(count, maxImages)} max={maxImages} />}</div></header>
    <div className="photo-notices"><p>Shared with your logo and other website images. Up to 10 photos per section.</p>
      {overLimit && <p role="alert" className="rounded-lg border border-amber-500 p-3 text-sm">Your current plan allows {maxImages} photos. Remove {count - maxImages!} to publish; your existing public website stays available.</p>}
      {atLimit && !overLimit && <p className="rounded-lg border border-amber-500 p-3 text-sm">Photo allowance reached. Remove photos and publish to make room, or change your demo subscription.</p>}
      {mustPublishRemovals && <p className="rounded-lg border border-amber-500 p-3 text-sm">Publish your photo removals before uploading replacements.</p>}
    </div>
    <fieldset disabled={disabled} className="photo-upload-card">
      <legend className="sr-only">Upload a product photo</legend>
      <label>01 · Choose a home for your photo
        <select aria-label="Photo destination" value={destination.key} onChange={event => setSelected(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3">
          {groups.map(group => <option key={group.key} value={group.key}>{group.label} ({group.photos.length}/10)</option>)}
        </select>
      </label>
      <label className="photo-file-picker">02 · Add something beautiful
        <input aria-label="Upload product photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || atLimit || mustPublishRemovals || destination.photos.length >= 10}
          onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onUpload(destination.key, file); event.currentTarget.value = ""; }}
          className="mt-2 block w-full min-w-0 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-700 file:px-3 file:py-3 file:text-white disabled:opacity-60" />
      </label>
      <p className="photo-upload-hint">JPEG, PNG, or WebP · Up to 5 MB each. {destination.photos.length >= 10 ? "This section is full; choose another destination." : "Changes stay in your preview until you publish."}</p>
      {uploading && <p role="status" className="text-sm sm:col-span-2">Uploading photo...</p>}
    </fieldset>
    <div className="space-y-5">{groups.filter(group => group.photos.length).map(group => <section key={group.key} aria-label={`${group.label} photos`} className="space-y-3">
      <h3 className="font-semibold">{group.label} <span className="text-sm font-normal">({group.photos.length}/10)</span></h3>
      <ul className="photo-card-grid">{group.photos.map((photo, index) => <li key={photo.ref} className="photo-card" data-photo-section={group.key}>
        <div className="photo-card-preview"><img src={photo.url} alt={details[photo.ref]?.name || `Photo ${index + 1} in ${group.label}`} /></div>
        <fieldset disabled={disabled} className="space-y-3"><legend className="sr-only">Photo {index + 1} in {group.label}</legend>
          <PhotoDetails key={resetKey} photoRef={photo.ref} details={details[photo.ref] ?? {}} onChange={value => onDetails(photo.ref, value)} onValidity={valid => onPriceValidity(photo.ref, valid)} />
          <div className="photo-size-control"><div className="photo-control-title"><span>Photo size</span><output>{details[photo.ref]?.widthPercent ?? 100}%</output></div>
            <div className="photo-size-presets" role="group" aria-label={`Size of photo ${index + 1} in ${group.label}`}>
              {([['Small', 33], ['Medium', 66], ['Large', 100]] as const).map(([label, width]) => <button key={label} type="button" aria-pressed={details[photo.ref]?.widthPercent === width} onClick={() => onDetails(photo.ref, { ...details[photo.ref], widthPercent: width })}>{label}</button>)}
            </div>
            <input type="range" min={25} max={100} step={1} aria-label={`Photo width ${index + 1} in ${group.label}`} value={details[photo.ref]?.widthPercent ?? 100} onChange={e => onDetails(photo.ref, { ...details[photo.ref], widthPercent: Number(e.target.value) })} />
            <p className="photo-help">Adjust the photo within its gallery space. Preview below.</p>
          </div>
          <label className="block text-sm">Move to section
            <select aria-label={`Move photo ${index + 1} from ${group.label}`} value={group.key} onChange={event => onMove(group.key, index, event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2">
              {groups.map(target => <option key={target.key} value={target.key} disabled={target.key !== group.key && target.photos.length >= 10}>{target.label}{target.photos.length >= 10 ? " (full)" : ""}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-3 text-sm">
            <button type="button" aria-label={`Move photo ${index + 1} earlier in ${group.label}`} disabled={disabled || index === 0} onClick={() => onReorder(group.key, index, -1)} className="text-indigo-700 underline disabled:opacity-40">Earlier</button>
            <button type="button" aria-label={`Move photo ${index + 1} later in ${group.label}`} disabled={disabled || index === group.photos.length - 1} onClick={() => onReorder(group.key, index, 1)} className="text-indigo-700 underline disabled:opacity-40">Later</button>
            <button type="button" aria-label={`Remove photo ${index + 1} from ${group.label}`} onClick={() => onRemove(group.key, index)} className="text-red-700 underline">Remove</button>
          </div>
        </fieldset>
      </li>)}</ul>
    </section>)}</div>
    {!groups.some(group => group.photos.length) && <div className="photo-empty"><svg aria-hidden="true" viewBox="0 0 120 100"><rect x="25" y="15" width="72" height="65" rx="12" fill="#e9e2ff" transform="rotate(9 60 50)"/><rect x="17" y="17" width="72" height="65" rx="12" fill="white" stroke="#c4b5fd" strokeWidth="2"/><circle cx="39" cy="37" r="7" fill="#f4c982"/><path d="m24 70 19-21 14 14 10-11 15 18" fill="#c4b5fd"/><path d="M98 10v16m-8-8h16" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round"/></svg><h3>Your showcase starts here</h3><p>No photos placed yet. Choose a section above and add your first favorite.</p><button type="button" onClick={() => document.querySelector<HTMLInputElement>('input[aria-label="Upload product photo"]')?.click()} disabled={disabled || atLimit || mustPublishRemovals}>＋ Add your first photo</button></div>}
  </section>;
}

function PhotoDetails({ photoRef, details, onChange, onValidity }: { photoRef: string; details: WebsitePhotoDetails[string]; onChange: (value: WebsitePhotoDetails[string]) => void; onValidity: (valid: boolean) => void }) {
  const [price, setPrice] = useState(details.priceCents === undefined ? "" : (details.priceCents / 100).toFixed(2));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setPrice(current => details.priceCents !== undefined && Math.round(Number(current) * 100) === details.priceCents ? current : details.priceCents === undefined ? "" : (details.priceCents / 100).toFixed(2));
  }, [details.priceCents]);
  return <div className="photo-product-fields"><label>Product name<input aria-label={`Product name for ${photoRef}`} maxLength={120} placeholder="e.g. Strawberry celebration cake" value={details.name ?? ""} onChange={e => onChange({ ...details, name: e.target.value })} /></label>
    <label>Price (USD)<div className="photo-price-input"><span aria-hidden="true">$</span><input aria-label={`Product price for ${photoRef}`} type="text" inputMode="decimal" placeholder="0.00" value={price} aria-invalid={invalid} onChange={e => {
      const text = e.target.value; setPrice(text);
      const valid = text === "" || (/^\d{1,5}(\.\d{0,2})?$/.test(text) && Number(text) > 0 && Number(text) <= 10000);
      setInvalid(!valid); onValidity(valid);
      if (valid) { const { priceCents: _old, ...rest } = details; onChange(text === "" ? rest : { ...rest, priceCents: Math.round(Number(text) * 100) }); }
    }} /></div></label>{invalid && <p role="alert" className="photo-field-error">Enter $0.01–$10,000 with up to two decimal places.</p>}
    <p className="photo-help">Optional details shown below this photo after publishing.</p>
  </div>;
}

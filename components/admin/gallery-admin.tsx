'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Pencil, Plus, Trash2, X, FolderPlus } from 'lucide-react'
import {
  deleteGalleryCategory,
  deleteGalleryPhoto,
  saveGalleryCategoryState,
  saveGalleryPhotoState,
} from '@/app/actions/admin'
import { AdminForm } from '@/components/admin/admin-form'
import { FieldGrid, TextField } from '@/components/admin/fields'
import { ImageField } from '@/components/admin/image-field'
import type { GalleryCategory, GalleryPhoto } from '@/lib/db/schema'
import type { GalleryPhotoWithCategory } from '@/lib/content-queries'
import { cn } from '@/lib/utils'

const cardCls = 'rounded-2xl border border-steel bg-card p-5 sm:p-6'
const deleteBtn =
  'inline-flex items-center gap-1.5 rounded-md border border-steel px-3 py-2 text-xs font-semibold text-light-grey transition-colors hover:border-red-500 hover:text-red-400'

// ── Category form ─────────────────────────────────────────────────────────

function CategoryForm({
  category,
  onDone,
}: {
  category?: GalleryCategory
  onDone?: () => void
}) {
  return (
    <div className={cn(cardCls, 'relative')}>
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="absolute right-4 top-4 rounded-full p-1 text-light-grey hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      )}
      <AdminForm action={saveGalleryCategoryState} submitLabel={category ? 'Save Category' : 'Add Category'}>
        <input type="hidden" name="id" defaultValue={category?.id ?? 0} />
        <FieldGrid>
          <TextField
            label="Category name"
            name="name"
            defaultValue={category?.name}
            required
            placeholder="e.g. Competition Night"
          />
          <TextField
            label="Sort order"
            name="sortOrder"
            type="number"
            defaultValue={String(category?.sortOrder ?? 0)}
          />
        </FieldGrid>
      </AdminForm>
      {category && (
        <form action={deleteGalleryCategory} className="mt-3 border-t border-steel/60 pt-3">
          <input type="hidden" name="id" value={category.id} />
          <button type="submit" className={deleteBtn}>
            <Trash2 className="size-3.5" /> Delete category &amp; all its photos
          </button>
        </form>
      )}
    </div>
  )
}

// ── Photo form ────────────────────────────────────────────────────────────

function PhotoForm({
  photo,
  categories,
  defaultCategoryId,
  onDone,
}: {
  photo?: GalleryPhoto
  categories: GalleryCategory[]
  defaultCategoryId?: number
  onDone?: () => void
}) {
  return (
    <div className={cn(cardCls, 'relative')}>
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="absolute right-4 top-4 rounded-full p-1 text-light-grey hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      )}
      <AdminForm action={saveGalleryPhotoState} submitLabel={photo ? 'Save Photo' : 'Add Photo'}>
        <input type="hidden" name="id" defaultValue={photo?.id ?? 0} />
        <ImageField label="Photo" name="url" defaultValue={photo?.url} />
        <FieldGrid>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-light-grey">
              Category
            </span>
            <select
              name="categoryId"
              defaultValue={photo?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? 0}
              className="w-full rounded-md border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-neon-blue"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Sort order"
            name="sortOrder"
            type="number"
            defaultValue={String(photo?.sortOrder ?? 0)}
          />
        </FieldGrid>
        <TextField
          label="Alt text (for accessibility & SEO)"
          name="alt"
          defaultValue={photo?.alt}
          placeholder="e.g. Member throwing a left hook at TENROUNDS Garsfontein"
        />
      </AdminForm>
      {photo && (
        <form action={deleteGalleryPhoto} className="mt-3 border-t border-steel/60 pt-3">
          <input type="hidden" name="id" value={photo.id} />
          <button type="submit" className={deleteBtn}>
            <Trash2 className="size-3.5" /> Delete photo
          </button>
        </form>
      )}
    </div>
  )
}

// ── Main Gallery Admin component ──────────────────────────────────────────

export function GalleryAdmin({
  categories,
  photos,
}: {
  categories: GalleryCategory[]
  photos: GalleryPhotoWithCategory[]
}) {
  const [activeCategory, setActiveCategory] = useState<number | null>(
    categories[0]?.id ?? null,
  )
  const [editingCategory, setEditingCategory] = useState<number | null>(null)
  const [addingCategory, setAddingCategory] = useState(false)
  const [addingPhoto, setAddingPhoto] = useState(false)
  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null)

  const visiblePhotos =
    activeCategory === null
      ? photos
      : photos.filter((p) => p.categoryId === activeCategory)

  return (
    <div className="space-y-8">
      {/* ── Category strip ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id)
                  setEditingCategory(null)
                  setAddingPhoto(false)
                }}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                  activeCategory === cat.id
                    ? 'border-neon-blue bg-cobalt text-accent-foreground'
                    : 'border-steel text-light-grey hover:border-neon-blue hover:text-foreground',
                )}
              >
                {cat.name}
                <span className="ml-1.5 opacity-60">
                  ({photos.filter((p) => p.categoryId === cat.id).length})
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditingCategory(editingCategory === cat.id ? null : cat.id)
                }
                aria-label={`Edit ${cat.name} category`}
                className="rounded p-1 text-light-grey transition-colors hover:text-neon-blue"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              setAddingCategory(!addingCategory)
              setEditingCategory(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-neon-blue/50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-neon-blue transition-colors hover:bg-neon-blue/10"
          >
            <FolderPlus className="size-3.5" />
            New Category
          </button>
        </div>

        {/* Add category inline form */}
        {addingCategory && (
          <div className="mt-4">
            <CategoryForm onDone={() => setAddingCategory(false)} />
          </div>
        )}

        {/* Edit category inline form */}
        {editingCategory !== null && (
          <div className="mt-4">
            <CategoryForm
              category={categories.find((c) => c.id === editingCategory)}
              onDone={() => setEditingCategory(null)}
            />
          </div>
        )}
      </div>

      {/* ── Photos grid for active category ── */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-light-grey">
            {activeCategory === null
              ? `All photos (${photos.length})`
              : `${categories.find((c) => c.id === activeCategory)?.name ?? ''} — ${visiblePhotos.length} photo${visiblePhotos.length === 1 ? '' : 's'}`}
          </p>
          <button
            type="button"
            onClick={() => {
              setAddingPhoto(!addingPhoto)
              setEditingPhotoId(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-neon-green/50 px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-neon-green transition-colors hover:bg-neon-green/10"
          >
            <ImagePlus className="size-4" />
            Add Photo
          </button>
        </div>

        {/* Add photo form */}
        {addingPhoto && (
          <div className="mt-4">
            <PhotoForm
              categories={categories}
              defaultCategoryId={activeCategory ?? undefined}
              onDone={() => setAddingPhoto(false)}
            />
          </div>
        )}

        {visiblePhotos.length === 0 && !addingPhoto ? (
          <div className="mt-6 rounded-xl border border-dashed border-steel py-12 text-center text-sm text-light-grey">
            No photos in this category yet. Click &ldquo;Add Photo&rdquo; above to upload the first one.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {visiblePhotos.map((photo) => (
              <div key={photo.id} className="group relative">
                {editingPhotoId === photo.id ? (
                  <PhotoForm
                    photo={photo}
                    categories={categories}
                    onDone={() => setEditingPhotoId(null)}
                  />
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-steel bg-charcoal">
                    <div className="relative aspect-square">
                      <Image
                        src={photo.url}
                        alt={photo.alt || 'Gallery photo'}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                        unoptimized={photo.url.includes('blob.vercel-storage.com') || photo.url.startsWith('https://')}
                      />
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setEditingPhotoId(photo.id)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-cobalt px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-neon-blue"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <form action={deleteGalleryPhoto}>
                        <input type="hidden" name="id" value={photo.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-900/40"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      </form>
                    </div>
                    {/* Category badge */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs font-medium uppercase tracking-wide text-light-grey">
                      {photo.categoryName}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

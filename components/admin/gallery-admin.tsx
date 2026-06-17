'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { Trash2, Plus, FolderEdit, X, Check, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  saveGalleryCategoryState,
  saveGalleryPhotoState,
  deleteGalleryCategory,
  deleteGalleryPhoto,
  updateGalleryPhotoCategory,
} from '@/app/actions/admin'
import { ImageField } from '@/components/admin/image-field'
import { AdminForm } from '@/components/admin/admin-form'
import { TextField } from '@/components/admin/fields'
import type { GalleryCategory } from '@/lib/db/schema'
import type { GalleryPhotoWithCategory } from '@/lib/content-queries'

// ── Category row ───────────────────────────────────────────────────────────

function CategoryRow({ cat }: { cat: GalleryCategory }) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!confirm(`Delete category "${cat.name}" and ALL its photos? This cannot be undone.`)) return
    const fd = new FormData(e.currentTarget)
    startTransition(() => { deleteGalleryCategory(fd) })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-steel/60 bg-white/[0.02] px-4 py-3">
      {editing ? (
        <AdminForm
          action={saveGalleryCategoryState}
          submitLabel="Save"
          onSuccess={() => setEditing(false)}
          compact
        >
          <input type="hidden" name="id" value={cat.id} />
          <input type="hidden" name="sortOrder" value={cat.sortOrder} />
          <div className="flex flex-1 items-center gap-2">
            <input
              name="name"
              defaultValue={cat.name}
              autoFocus
              className="flex-1 rounded-md border border-steel bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-neon-blue"
            />
            <button type="submit" className="rounded-md bg-neon-green/20 p-1.5 text-neon-green hover:bg-neon-green/30">
              <Check className="size-4" />
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md p-1.5 text-light-grey hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        </AdminForm>
      ) : (
        <>
          <span className="flex-1 text-sm font-semibold text-foreground">{cat.name}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded p-1 text-light-grey transition-colors hover:text-neon-blue"
            title="Rename category"
          >
            <FolderEdit className="size-4" />
          </button>
          <form onSubmit={handleDelete}>
            <input type="hidden" name="id" value={cat.id} />
            <button
              type="submit"
              disabled={pending}
              className="rounded p-1 text-light-grey transition-colors hover:text-red-400 disabled:opacity-40"
              title="Delete category and all photos"
            >
              <Trash2 className="size-4" />
            </button>
          </form>
        </>
      )}
    </div>
  )
}

// ── Photo list row ─────────────────────────────────────────────────────────

function PhotoRow({
  photo,
  categories,
}: {
  photo: GalleryPhotoWithCategory
  categories: GalleryCategory[]
}) {
  const [pending, startTransition] = useTransition()

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData()
    fd.set('id', String(photo.id))
    fd.set('categoryId', e.target.value)
    startTransition(() => { updateGalleryPhotoCategory(fd) })
  }

  function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!confirm('Delete this photo?')) return
    const fd = new FormData(e.currentTarget)
    startTransition(() => { deleteGalleryPhoto(fd) })
  }

  const filename = photo.url.split('/').pop() ?? photo.url
  const isExternal = photo.url.startsWith('http')

  return (
    <tr className={cn(
      'border-b border-steel/40 transition-colors hover:bg-white/[0.02]',
      pending && 'opacity-40 pointer-events-none'
    )}>
      {/* Thumbnail */}
      <td className="px-3 py-2">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-steel/60 bg-charcoal">
          <Image
            src={photo.url}
            alt={photo.alt || filename}
            fill
            sizes="44px"
            className="object-cover"
            unoptimized={isExternal}
          />
        </div>
      </td>
      {/* Filename / alt */}
      <td className="px-3 py-2">
        <p className="truncate text-xs font-medium text-foreground" title={filename}>{filename}</p>
        {photo.alt && (
          <p className="mt-0.5 line-clamp-1 text-xs text-light-grey" title={photo.alt}>{photo.alt}</p>
        )}
      </td>
      {/* Category dropdown — changes save instantly */}
      <td className="px-3 py-2">
        <select
          defaultValue={photo.categoryId}
          onChange={handleCategoryChange}
          disabled={pending}
          className="rounded-md border border-steel bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-neon-blue disabled:opacity-50"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>
      {/* Delete */}
      <td className="px-3 py-2 text-right">
        <form onSubmit={handleDelete}>
          <input type="hidden" name="id" value={photo.id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded p-1.5 text-light-grey transition-colors hover:text-red-400 disabled:opacity-40"
            title="Delete photo"
          >
            <Trash2 className="size-4" />
          </button>
        </form>
      </td>
    </tr>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function GalleryAdmin({
  categories,
  photos,
}: {
  categories: GalleryCategory[]
  photos: GalleryPhotoWithCategory[]
}) {
  const [showAddPhoto, setShowAddPhoto] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [filterCat, setFilterCat] = useState<number | 'all'>('all')

  const filteredPhotos =
    filterCat === 'all' ? photos : photos.filter((p) => p.categoryId === filterCat)

  return (
    <div className="space-y-10">

      {/* ── Categories ── */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-black uppercase tracking-tight text-foreground">
            Categories
          </h3>
          <button
            type="button"
            onClick={() => setShowAddCategory((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-neon-blue/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-neon-blue transition-colors hover:bg-neon-blue/10"
          >
            <Plus className="size-3.5" /> New Category
          </button>
        </div>

        {showAddCategory && (
          <div className="mt-4 rounded-xl border border-steel/60 bg-background/50 p-5">
            <AdminForm
              action={saveGalleryCategoryState}
              submitLabel="Create Category"
              onSuccess={() => setShowAddCategory(false)}
            >
              <input type="hidden" name="id" value={0} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <TextField label="Category name" name="name" required placeholder="e.g. Events" />
                </div>
                <div className="w-28">
                  <TextField label="Sort order" name="sortOrder" type="number" defaultValue="0" />
                </div>
              </div>
            </AdminForm>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} />
          ))}
        </div>
      </div>

      {/* ── Photos list ── */}
      <div className="border-t border-steel pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-black uppercase tracking-tight text-foreground">
            Photos{' '}
            <span className="ml-1 text-sm font-normal text-light-grey">({filteredPhotos.length})</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowAddPhoto((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-neon-green px-3 py-2 text-xs font-bold uppercase tracking-wide text-background transition-colors hover:bg-neon-green/80"
          >
            <Upload className="size-3.5" /> Upload Photo
          </button>
        </div>

        {/* Add photo form */}
        {showAddPhoto && (
          <div className="mt-4 rounded-xl border border-steel/60 bg-background/50 p-5">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-light-grey">New Photo</h4>
            <AdminForm
              action={saveGalleryPhotoState}
              submitLabel="Add Photo"
              onSuccess={() => setShowAddPhoto(false)}
            >
              <input type="hidden" name="id" value={0} />
              <ImageField label="Photo" name="url" required />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <TextField
                    label="Alt text (SEO & accessibility)"
                    name="alt"
                    placeholder="e.g. Member throwing a combination at TENROUNDS"
                  />
                </div>
                <div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-light-grey">Category</span>
                    <select
                      name="categoryId"
                      required
                      className="rounded-md border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-neon-blue"
                    >
                      <option value="">Select…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="mt-4 w-32">
                <TextField label="Sort order" name="sortOrder" type="number" defaultValue="0" />
              </div>
            </AdminForm>
          </div>
        )}

        {/* Category filter chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterCat('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors',
              filterCat === 'all'
                ? 'border-neon-blue bg-cobalt text-accent-foreground'
                : 'border-steel text-light-grey hover:border-neon-blue hover:text-foreground',
            )}
          >
            All ({photos.length})
          </button>
          {categories.map((c) => {
            const count = photos.filter((p) => p.categoryId === c.id).length
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilterCat(c.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors',
                  filterCat === c.id
                    ? 'border-neon-blue bg-cobalt text-accent-foreground'
                    : 'border-steel text-light-grey hover:border-neon-blue hover:text-foreground',
                )}
              >
                {c.name} ({count})
              </button>
            )
          })}
        </div>

        {/* List table */}
        {filteredPhotos.length === 0 ? (
          <p className="mt-6 text-sm text-light-grey">No photos yet. Click &ldquo;Upload Photo&rdquo; to add one.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-steel/60">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-steel/60 bg-white/[0.03]">
                  <th className="w-14 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-light-grey">
                    Thumb
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-light-grey">
                    File / Alt text
                  </th>
                  <th className="w-48 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-light-grey">
                    Category
                  </th>
                  <th className="w-14 px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-light-grey">
                    Del
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPhotos.map((photo) => (
                  <PhotoRow key={photo.id} photo={photo} categories={categories} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

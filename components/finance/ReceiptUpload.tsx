'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, X, FileText } from 'lucide-react'

export function ReceiptUpload({ transactionId }: { transactionId?: string }) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `receipts/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`

    const { data, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)

    // Create receipt record
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('receipts').insert({
      transaction_id: transactionId || null,
      filename: file.name,
      storage_path: path,
      content_type: file.type,
      file_size_bytes: file.size,
      uploaded_by: user?.id,
    })

    // If linked to transaction, update receipt_url
    if (transactionId) {
      await supabase.from('transactions').update({
        receipt_url: publicUrl,
        receipt_storage_path: path,
      }).eq('id', transactionId)
    }

    setSuccess(true)
    setUploading(false)
    setTimeout(() => {
      setOpen(false)
      setSuccess(false)
      router.refresh()
    }, 1500)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <Upload className="w-4 h-4" />
        Upload Receipt
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Upload Receipt
              </h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-foreground font-medium">Receipt uploaded!</p>
              </div>
            ) : (
              <div>
                {error && <p className="text-sm text-destructive mb-3">{error}</p>}

                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to select a file'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF, JPG, PNG supported</p>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

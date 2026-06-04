import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  PencilEdit01Icon,
  Delete01Icon,
  UploadIcon,
  EyeIcon,
} from "@hugeicons/core-free-icons";

import { Can } from "@/lib/auth";
import { DataTable, DataTableColumnHeader, DEFAULT_QUERY_STATE } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Constants ─────────────────────────────────────────────────

const QK = ["customer-informations"];

const PREFIXES = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."];

const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Argentinian", "Australian",
  "Austrian", "Bangladeshi", "Belgian", "Brazilian", "British", "Bulgarian",
  "Canadian", "Chilean", "Chinese", "Colombian", "Croatian", "Czech", "Danish",
  "Dutch", "Egyptian", "Ethiopian", "Finnish", "French", "German", "Greek",
  "Hungarian", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli",
  "Italian", "Japanese", "Jordanian", "Kenyan", "Korean", "Lebanese", "Malaysian",
  "Mexican", "Moroccan", "Nepalese", "New Zealander", "Nigerian", "Norwegian",
  "Pakistani", "Peruvian", "Polish", "Portuguese", "Romanian", "Russian",
  "Saudi Arabian", "Serbian", "Singaporean", "South African", "Spanish",
  "Sri Lankan", "Swedish", "Swiss", "Thai", "Turkish", "Ukrainian",
  "Emirati", "Venezuelan", "Vietnamese",
];

const EMPTY = {
  prefix: "__none__",
  customer_name: "",
  ledger_id: "",
  dob: "",
  nationality: "",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  state_name: "",
  city_name: "",
  zip_code: "",
  mobile_no1: "",
  mobile_no2: "",
  email_id: "",
  pan_card: "",
  passport_no: "",
  passport_issue_date: "",
  passport_expiry_date: "",
  visa_no: "",
  visa_issue_date: "",
  visa_expiry_date: "",
};

// ── Autocomplete input (state / city) ─────────────────────────

function AutocompleteInput({ value, onChange, searchCmd, placeholder }) {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!value.trim()) {
      setOptions([]);
      return;
    }
    const t = setTimeout(() => {
      invoke(searchCmd, { q: value })
        .then((res) => setOptions(res))
        .catch(() => setOptions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [value, searchCmd]);

  useEffect(() => {
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim()) setOpen(true);
        }}
        placeholder={placeholder}
      />
      {open && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          <div className="max-h-44 overflow-y-auto">
            {options.map((opt) => (
              <div
                key={opt.id}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.name);
                  setOpen(false);
                }}
              >
                {opt.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nationality searchable combobox (local filter) ───────────

function NationalityInput({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const options = useMemo(() => {
    const q = value.trim().toLowerCase();
    const pinned = ["Indian"];
    const rest = NATIONALITIES.filter((n) => !pinned.includes(n));
    const all = [...pinned, ...rest];
    if (!q) return all.slice(0, 30);
    return all.filter((n) => n.toLowerCase().includes(q));
  }, [value]);

  useEffect(() => {
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Type to search nationality…"
        autoComplete="off"
      />
      {open && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          <div className="max-h-44 overflow-y-auto">
            {options.map((nat) => (
              <div
                key={nat}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(nat);
                  setOpen(false);
                }}
              >
                {nat}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div className="col-span-2 flex items-center gap-3 pb-1 pt-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </span>
      <div className="flex-1 border-t" />
    </div>
  );
}

// ── Document row ──────────────────────────────────────────────

function DocRow({ doc, custId, onDeleted, onPreview }) {
  const [removing, setRemoving] = useState(false);
  const isImage = doc.content_type?.startsWith("image/");
  const sizeKb = ((doc.size ?? 0) / 1024).toFixed(1);

  async function handleRemove() {
    setRemoving(true);
    try {
      await invoke("delete_customer_document", {
        custId,
        documentId: doc.document_id,
      });
      onDeleted(doc.document_id);
      toast.success("Document removed");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0">{isImage ? "🖼" : "📄"}</span>
        <span className="truncate font-medium">{doc.file_name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{sizeKb} KB</span>
      </div>
      <div className="ml-2 flex items-center gap-1">
        {isImage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onPreview(doc)}
              >
                <HugeiconsIcon icon={EyeIcon} strokeWidth={2} className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Preview</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              disabled={removing}
              onClick={handleRemove}
            >
              <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function LodgeCustomerInfo() {
  const enterNav = useEnterNav();
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [docs, setDocs] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]); // staged before customer is saved
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);

  const setF = useCallback((key, val) => setForm((f) => ({ ...f, [key]: val })), []);

  // ── Queries ──────────────────────────────────────────────────

  const query = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_customer_informations", { qs }),
    placeholderData: (prev) => prev,
  });

  const segmentsQuery = useQuery({
    queryKey: ["all-market-segments"],
    queryFn: () => invoke("get_all_market_segments"),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });

  // Load documents when editing
  useEffect(() => {
    if (dialog.open && dialog.mode === "edit" && dialog.data?.id) {
      invoke("get_customer_documents", { custId: dialog.data.id })
        .then(setDocs)
        .catch(() => setDocs([]));
    } else if (!dialog.open) {
      setDocs([]);
    }
  }, [dialog.open, dialog.mode, dialog.data?.id]);

  // ── Mutations ────────────────────────────────────────────────

  function buildParams(d) {
    return {
      prefix: (d.prefix && d.prefix !== "__none__") ? d.prefix : null,
      customerName: d.customer_name,
      ledgerId: d.ledger_id ? parseInt(d.ledger_id, 10) : null,
      dob: d.dob || null,
      nationality: d.nationality || null,
      addressLine1: d.address_line1 || null,
      addressLine2: d.address_line2 || null,
      addressLine3: d.address_line3 || null,
      stateName: d.state_name || null,
      cityName: d.city_name || null,
      zipCode: d.zip_code || null,
      mobileNo1: d.mobile_no1 || null,
      mobileNo2: d.mobile_no2 || null,
      emailId: d.email_id || null,
      panCard: d.pan_card || null,
      passportNo: d.passport_no || null,
      passportIssueDate: d.passport_issue_date || null,
      passportExpiryDate: d.passport_expiry_date || null,
      visaNo: d.visa_no || null,
      visaIssueDate: d.visa_issue_date || null,
      visaExpiryDate: d.visa_expiry_date || null,
    };
  }

  const createMut = useMutation({
    mutationFn: ({ formData }) => invoke("create_customer_information", buildParams(formData)),
    onSuccess: async (newId, { pending }) => {
      // Upload any files the user staged before saving
      for (const doc of pending) {
        try {
          await invoke("save_customer_document", {
            custId: newId,
            fileName: doc.name,
            contentType: doc.type,
            documentDataB64: doc.b64,
            size: doc.size,
          });
        } catch (e) {
          toast.error(`Could not upload "${doc.name}": ${String(e)}`);
        }
      }
      const msg =
        pending.length > 0
          ? `Customer created with ${pending.length} document(s).`
          : "Customer created.";
      toast.success(msg);
      inv();
      setPendingDocs([]);
      closeDialog();
    },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) =>
      invoke("update_customer_information", { id: d.id, ...buildParams(d) }),
    onSuccess: () => {
      toast.success("Customer updated");
      inv();
      closeDialog();
    },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_customer_information_active", {
        id,
        isActive: is_active === 1 ? 0 : 1,
      }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_customer_information", { id }),
    onSuccess: () => {
      toast.success("Customer deleted");
      inv();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(String(e)),
  });

  // ── Dialog helpers ───────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY);
    setPendingDocs([]);
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({
      prefix: row.prefix || "__none__",
      customer_name: row.customer_name ?? "",
      ledger_id: row.ledger_id ? String(row.ledger_id) : "",
      dob: row.dob ?? "",
      nationality: row.nationality ?? "",
      address_line1: row.address_line1 ?? "",
      address_line2: row.address_line2 ?? "",
      address_line3: row.address_line3 ?? "",
      state_name: row.state_name ?? "",
      city_name: row.city_name ?? "",
      zip_code: row.zip_code ?? "",
      mobile_no1: row.mobile_no1 ?? "",
      mobile_no2: row.mobile_no2 ?? "",
      email_id: row.email_id ?? "",
      pan_card: row.pan_card ?? "",
      passport_no: row.passport_no ?? "",
      passport_issue_date: row.passport_issue_date ?? "",
      passport_expiry_date: row.passport_expiry_date ?? "",
      visa_no: row.visa_no ?? "",
      visa_issue_date: row.visa_issue_date ?? "",
      visa_expiry_date: row.visa_expiry_date ?? "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() {
    setPendingDocs([]);
    setDialog((d) => ({ ...d, open: false }));
  }

  // ── Form validation & submit ─────────────────────────────────

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!form.ledger_id) {
      toast.error("Market segment is required");
      return;
    }
    if (!form.dob) {
      toast.error("Date of birth is required");
      return;
    }
    if (!form.nationality) {
      toast.error("Nationality is required");
      return;
    }
    if (!form.address_line1.trim()) {
      toast.error("Address line 1 is required");
      return;
    }
    if (!form.mobile_no1.trim()) {
      toast.error("Mobile 1 is required");
      return;
    }
    if (dialog.mode === "create") {
      createMut.mutate({ formData: form, pending: pendingDocs });
    } else {
      updateMut.mutate({ id: dialog.data.id, ...form });
    }
  }

  // ── File upload ──────────────────────────────────────────────

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        // strip "data:<type>;base64," prefix
        const b64 = ev.target.result.split(",")[1];
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const b64 = await readFileAsBase64(file);
      if (dialog.mode === "create") {
        // Stage locally; uploaded in batch when customer is saved
        setPendingDocs((prev) => [
          ...prev,
          {
            localId: `${Date.now()}-${Math.random()}`,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            b64,
          },
        ]);
      } else {
        // Edit mode — upload immediately
        await invoke("save_customer_document", {
          custId: dialog.data.id,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          documentDataB64: b64,
          size: file.size,
        });
        const updated = await invoke("get_customer_documents", {
          custId: dialog.data.id,
        });
        setDocs(updated);
        toast.success(`"${file.name}" uploaded`);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setUploading(false);
    }
  }

  function handleDocDeleted(docId) {
    setDocs((prev) => prev.filter((d) => d.document_id !== docId));
  }

  function handlePendingDocRemove(localId) {
    setPendingDocs((prev) => prev.filter((d) => d.localId !== localId));
  }

  async function handleDocPreview(doc) {
    try {
      const b64 = await invoke("get_customer_document_data", {
        custId: dialog.data.id,
        documentId: doc.document_id,
      });
      setPreviewDoc({
        file_name: doc.file_name,
        content_type: doc.content_type,
        dataUrl: `data:${doc.content_type};base64,${b64}`,
      });
    } catch (err) {
      toast.error(String(err));
    }
  }

  // ── Table columns ────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        size: 75,
        meta: { label: "Code" },
      },
      {
        accessorKey: "customer_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Customer Name" />
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.prefix ? `${row.original.prefix} ` : ""}
              {row.original.customer_name}
            </div>
            {row.original.segment_name && (
              <div className="text-xs text-muted-foreground">
                {row.original.segment_name}
              </div>
            )}
          </div>
        ),
        meta: { label: "Customer Name" },
      },
      {
        accessorKey: "mobile_no1",
        header: "Mobile",
        size: 130,
        cell: ({ row }) =>
          row.original.mobile_no1 ?? (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        meta: { label: "Mobile" },
      },
      {
        accessorKey: "email_id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) =>
          row.original.email_id ?? (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        meta: { label: "Email" },
      },
      {
        id: "location",
        header: "Location",
        size: 140,
        cell: ({ row }) => {
          const parts = [row.original.city_name, row.original.state_name].filter(Boolean);
          return parts.length > 0 ? (
            <span>{parts.join(", ")}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
        meta: { label: "Location" },
      },
      {
        id: "docs",
        header: "Docs",
        size: 55,
        cell: ({ row }) =>
          row.original.has_documents ? (
            <span className="text-xs font-semibold text-primary">Yes</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        meta: { label: "Docs" },
      },
      {
        accessorKey: "is_active",
        header: "Active",
        size: 75,
        cell: ({ row }) => (
          <Switch
            size="sm"
            checked={row.original.is_active === 1}
            onCheckedChange={() => toggleMut.mutate(row.original)}
            disabled={toggleMut.isPending}
          />
        ),
        meta: { label: "Active" },
      },
      {
        id: "actions",
        header: "Actions",
        size: 90,
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <Can perm="lodge-customer:update">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(row.original)}
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </Can>
            <Can perm="lodge-customer:delete">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(row.original)}
                  >
                    <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </Can>
          </div>
        ),
      },
    ],
    [toggleMut.isPending], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const isPending = createMut.isPending || updateMut.isPending;
  const custId = dialog.data?.id;

  // ── Render ───────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={query.data?.data ?? []}
              total={query.data?.total ?? 0}
              state={qs}
              onStateChange={setQs}
              loading={query.isLoading}
              searchPlaceholder="Search by name, mobile or email…"
              emptyText="No customers found."
              toolbar={
                <Can perm="lodge-customer:add">
                  <Button size="sm" onClick={openCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                    New Customer
                  </Button>
                </Can>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Create / Edit dialog ─────────────────────────────── */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "New Customer" : "Edit Customer"}
            </DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Fill in the details below to create a new customer record."
                : `Customer ID: ${custId}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={enterNav}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">

              {/* ─── Customer Details ─── */}
              <SectionTitle>Customer Details</SectionTitle>

              <Field className="col-span-1">
                <FieldLabel>Prefix</FieldLabel>
                <Select value={form.prefix} onValueChange={(v) => setF("prefix", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {PREFIXES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field className="col-span-1">
                <FieldLabel>
                  Customer Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  value={form.customer_name}
                  maxLength={50}
                  onChange={(e) => setF("customer_name", e.target.value)}
                  placeholder="Full name"
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>
                  Market Segment <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  value={form.ledger_id}
                  onValueChange={(v) => setF("ledger_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(segmentsQuery.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field className="col-span-1">
                <FieldLabel>
                  Date of Birth <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setF("dob", e.target.value)}
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>
                  Nationality <span className="text-destructive">*</span>
                </FieldLabel>
                <NationalityInput
                  value={form.nationality}
                  onChange={(v) => setF("nationality", v)}
                />
              </Field>

              {/* ─── Address ─── */}
              <SectionTitle>Address</SectionTitle>

              <Field className="col-span-2">
                <FieldLabel>
                  Address Line 1 <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  value={form.address_line1}
                  maxLength={100}
                  onChange={(e) => setF("address_line1", e.target.value)}
                  placeholder="Street / Building / House No."
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Address Line 2</FieldLabel>
                <Input
                  value={form.address_line2}
                  maxLength={100}
                  onChange={(e) => setF("address_line2", e.target.value)}
                  placeholder="Area / Colony"
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Address Line 3</FieldLabel>
                <Input
                  value={form.address_line3}
                  maxLength={100}
                  onChange={(e) => setF("address_line3", e.target.value)}
                  placeholder="Landmark (optional)"
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>
                  State
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (type to search or create)
                  </span>
                </FieldLabel>
                <AutocompleteInput
                  value={form.state_name}
                  onChange={(v) => setF("state_name", v)}
                  searchCmd="search_states"
                  placeholder="e.g. Maharashtra"
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>
                  City / Place
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (type to search or create)
                  </span>
                </FieldLabel>
                <AutocompleteInput
                  value={form.city_name}
                  onChange={(v) => setF("city_name", v)}
                  searchCmd="search_cities"
                  placeholder="e.g. Pune"
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Pin Code</FieldLabel>
                <Input
                  value={form.zip_code}
                  maxLength={20}
                  onChange={(e) => setF("zip_code", e.target.value)}
                  placeholder="PIN / ZIP code"
                />
              </Field>

              {/* ─── Contact ─── */}
              <SectionTitle>Contact Details</SectionTitle>

              <Field className="col-span-1">
                <FieldLabel>
                  Mobile 1 <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  type="tel"
                  value={form.mobile_no1}
                  maxLength={15}
                  onChange={(e) => setF("mobile_no1", e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Mobile 2</FieldLabel>
                <Input
                  type="tel"
                  value={form.mobile_no2}
                  maxLength={15}
                  onChange={(e) => setF("mobile_no2", e.target.value)}
                  placeholder="Alternate number"
                />
              </Field>

              <Field className="col-span-2">
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={form.email_id}
                  maxLength={50}
                  onChange={(e) => setF("email_id", e.target.value)}
                  placeholder="customer@example.com"
                />
              </Field>

              {/* ─── Identity & Travel ─── */}
              <SectionTitle>Identity &amp; Travel Documents</SectionTitle>

              <Field className="col-span-1">
                <FieldLabel>PAN Card</FieldLabel>
                <Input
                  value={form.pan_card}
                  maxLength={50}
                  onChange={(e) => setF("pan_card", e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Passport No.</FieldLabel>
                <Input
                  value={form.passport_no}
                  maxLength={50}
                  onChange={(e) => setF("passport_no", e.target.value.toUpperCase())}
                  placeholder="A1234567"
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Passport Issue Date</FieldLabel>
                <Input
                  type="date"
                  value={form.passport_issue_date}
                  onChange={(e) => setF("passport_issue_date", e.target.value)}
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Passport Expiry Date</FieldLabel>
                <Input
                  type="date"
                  value={form.passport_expiry_date}
                  onChange={(e) => setF("passport_expiry_date", e.target.value)}
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Visa No.</FieldLabel>
                <Input
                  value={form.visa_no}
                  maxLength={50}
                  onChange={(e) => setF("visa_no", e.target.value.toUpperCase())}
                  placeholder="Visa number"
                />
              </Field>

              <Field className="col-span-1" />

              <Field className="col-span-1">
                <FieldLabel>Visa Issue Date</FieldLabel>
                <Input
                  type="date"
                  value={form.visa_issue_date}
                  onChange={(e) => setF("visa_issue_date", e.target.value)}
                />
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Visa Expiry Date</FieldLabel>
                <Input
                  type="date"
                  value={form.visa_expiry_date}
                  onChange={(e) => setF("visa_expiry_date", e.target.value)}
                />
              </Field>

              {/* ─── Documents & Photos ─── */}
              <SectionTitle>Documents &amp; Photos</SectionTitle>

              <div className="col-span-2 flex flex-col gap-3">
                {/* Upload button — always visible */}
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <HugeiconsIcon icon={UploadIcon} strokeWidth={2} className="mr-1.5 size-4" />
                    {uploading ? "Reading file…" : "Attach File"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Images (JPG, PNG), PDF, Word documents
                  </span>
                </div>

                {/* Pending docs (create mode — not yet saved to DB) */}
                {pendingDocs.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {pendingDocs.map((doc) => (
                      <div
                        key={doc.localId}
                        className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0">
                            {doc.type.startsWith("image/") ? "🖼" : "📄"}
                          </span>
                          <span className="truncate font-medium">{doc.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {(doc.size / 1024).toFixed(1)} KB
                          </span>
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            pending
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="ml-2 text-destructive hover:text-destructive"
                          onClick={() => handlePendingDocRemove(doc.localId)}
                        >
                          <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Saved docs (edit mode) */}
                {dialog.mode === "edit" && (
                  docs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {docs.map((doc) => (
                        <DocRow
                          key={doc.document_id}
                          doc={doc}
                          custId={custId}
                          onDeleted={handleDocDeleted}
                          onPreview={handleDocPreview}
                        />
                      ))}
                    </div>
                  )
                )}

                {dialog.mode === "create" && pendingDocs.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No files attached yet. Files will be saved when you create the customer.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {dialog.mode === "create" ? "Cancel" : "Close"}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving…"
                  : dialog.mode === "create"
                  ? "Create Customer"
                  : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Image preview dialog ──────────────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewDoc?.file_name}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <img
              src={previewDoc.dataUrl}
              alt={previewDoc.file_name}
              className="max-h-[65vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.customer_name}</strong>? All uploaded documents will
              also be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

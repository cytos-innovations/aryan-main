import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { Can } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "details",   label: "Details" },
  { id: "excise",    label: "Excise / Other" },
  { id: "special",   label: "Special Info" },
  { id: "partner",   label: "Partner Detail" },
  { id: "email_sms", label: "Email / SMS" },
  { id: "param1",    label: "Parameter" },
  { id: "param2",    label: "Parameter 2" },
];

const EMPTY = {
  company_name: "", company_name2: "", name2: "",
  start_date: "", end_date: "",
  address_line1: "", address_line2: "", address_line3: "",
  fssai_no: "", phone_no1: "", phone_no2: "", fax_no: "", email_id: "",
  sms_sender: "", licenses_date: "", licenses_no: "",
  gst_serial_no: "", registration_key: "",
  print_name_address: "N",
  vat_tin_no: "", cst_no: "", service_tax_no: "", luxury_tax_no: "",
  pan_no: "", it_pan_no: "", gst_no: "", sac_no: "",
  database_name: "", dsn_name: "", database_path: "",
  bank_detail: "", print_option: "",
  bill_heading: "", special_message: "",
  print_company_name_bill: "Y", print_address_yn: "Y",
  print_after_save_kot: "N", print_bill_yn: "Y",
  print_no_of_person_bill: "N", print_detail_bill: "N",
  time_on_bill_yn: "N", allow_delay: "N",
  cash_drawer_yn: "N", otp_rate_change_yn: "N",
  allow_sharing_yn: "N", reprint_yn: "Y",
  direct_bill_yn: "N", kot_cancel: "Y",
  multi_user: "N", bill_settlement_yn: "N",
  cancellation_message_yn: "N", print_token_yn: "N",
  print_bill_footer_yn: "N",
  time_format: "12", no_of_line_kot: "5",
  no_of_line_forward: 5, no_of_line_backward: 0,
  page_length_bill: "", parcel_sec_code: 1, non_chargeable: 0,
  printer_setting: "TH",
  partner_company_name: "", partner_address1: "", partner_address2: "",
  partner_address3: "", partner_phone1: "", partner_phone2: "",
  partner_email: "", end_of_report: "",
  mail_active_yn: "N", mail_id: "", mail_password: "",
  mail_head: "", mail_body: "",
  send_mail_guest_yn: "N", send_mail_company_yn: "N",
  receiver_email1: "", receiver_email2: "", receiver_email3: "",
  sms_active: "N", sms_user_name: "", sms_password: "",
  waiter_yn: "Y", covers_yn: "Y",
  outlet_printer_food: 1, outlet_printer_liquor: 0, max_qty: 0,
  modify_current_bill_yn: "N", modify_settled_bill_yn: "N",
  complementary_yn: "N", bill_closed_yn: "N",
  print_table_no_yn: "N", print_company_logo_yn: "N",
  include_tax_yn: "Y", print_gst_serial_no_yn: "N",
  allow_lodge_posting: "N", domain_name: "", pay_upi_id: "",
  print_receipt_no_yn: "N", sale_ratewise_yn: "N", backup_path_name: "",
  sale_jv_ledger: "", jv_ledger: "", roundoff_ledger: "",
  barcode_yn: "N", search_type: 1,
  online_order_yn: "N", online_merchant_id: "",
  online_direct_bill: "N", time_on_kot_yn: "Y", multiple_order_yn: "N",
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function yn(val) { return val === "Y"; }
function toYN(bool) { return bool ? "Y" : "N"; }

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function SwitchRow({ label, fieldKey, form, setF }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Switch
        checked={yn(form[fieldKey])}
        onCheckedChange={(v) => setF(fieldKey, toYN(v))}
      />
    </div>
  );
}

function TogglePair({ label, fieldKey, options, form, setF }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={form[fieldKey] === opt.value ? "default" : "outline"}
            className="h-7 px-3 text-xs"
            onClick={() => setF(fieldKey, opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function TextRow({ label, fieldKey, form, setF, type = "text", placeholder }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        placeholder={placeholder}
        value={form[fieldKey] ?? ""}
        onChange={(e) => setF(fieldKey, e.target.value)}
      />
    </Field>
  );
}

function NumField({ label, fieldKey, form, setF }) {
  return (
    <Field>
      <FieldLabel className="text-sm text-muted-foreground">{label}</FieldLabel>
      <Input
        type="number"
        value={form[fieldKey] ?? 0}
        onChange={(e) => setF(fieldKey, Number(e.target.value))}
      />
    </Field>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function CompanyDetails() {
  const [activeTab, setActiveTab] = useState("details");
  const [form, setForm] = useState(EMPTY);

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const { isLoading } = useQuery({
    queryKey: ["company-details"],
    queryFn: () => invoke("get_company_details"),
    onSuccess: (data) => {
      setForm({
        ...EMPTY,
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, v === null || v === undefined ? (EMPTY[k] ?? "") : v])
        ),
      });
    },
  });

  const saveMut = useMutation({
    mutationFn: () => invoke("save_company_details", { data: form }),
    onSuccess: () => toast.success("Company details saved"),
    onError: (e) => toast.error(String(e)),
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg">Company Details</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" type="button" onClick={() => setForm(EMPTY)}>
                New Company
              </Button>
              <Button variant="outline" type="button" disabled>
                New Financial Year
              </Button>
              <Can permission="company-details:update">
                <Button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving…" : "Save"}
                </Button>
              </Can>
              <div className="h-6 w-px bg-border mx-1" />
              <Button variant="secondary" type="button" disabled>
                Start Backup
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4 pb-6">
            {/* Tab bar */}
            <div className="flex gap-1 border-b mb-4 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={[
                    "shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === t.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Details ── */}
            {activeTab === "details" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <TextRow label="Company Name" fieldKey="company_name" form={form} setF={setF} placeholder="e.g. ARYAN SOFTWARE" />
                <TextRow label="Company Name 2" fieldKey="company_name2" form={form} setF={setF} />
                <TextRow label="Name 2 (Sub-name)" fieldKey="name2" form={form} setF={setF} placeholder="e.g. VEG NON VEG" />
                <div />
                <Field>
                  <FieldLabel>Start Date</FieldLabel>
                  <Input type="date" value={form.start_date ?? ""} onChange={(e) => setF("start_date", e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>End Date</FieldLabel>
                  <Input type="date" value={form.end_date ?? ""} onChange={(e) => setF("end_date", e.target.value)} />
                </Field>
                <TextRow label="Address 1" fieldKey="address_line1" form={form} setF={setF} />
                <TextRow label="Address 2" fieldKey="address_line2" form={form} setF={setF} />
                <TextRow label="FSSAI No" fieldKey="fssai_no" form={form} setF={setF} />
                <TextRow label="Email ID" fieldKey="email_id" form={form} setF={setF} type="email" />
                <TextRow label="Phone No 1" fieldKey="phone_no1" form={form} setF={setF} />
                <TextRow label="Phone No 2" fieldKey="phone_no2" form={form} setF={setF} />
                <TextRow label="SMS Sender" fieldKey="sms_sender" form={form} setF={setF} />
                <Field>
                  <FieldLabel>Licenses Date</FieldLabel>
                  <Input type="date" value={form.licenses_date ?? ""} onChange={(e) => setF("licenses_date", e.target.value)} />
                </Field>
                <TextRow label="Licenses No" fieldKey="licenses_no" form={form} setF={setF} />
                <TextRow label="GST Serial No" fieldKey="gst_serial_no" form={form} setF={setF} />
                <TextRow label="Registration Key" fieldKey="registration_key" form={form} setF={setF} />
                <div className="md:col-span-2">
                  <SwitchRow label="Print Name & Address on Bill" fieldKey="print_name_address" form={form} setF={setF} />
                </div>
              </div>
            )}

            {/* ── Tab: Excise / Other ── */}
            {activeTab === "excise" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <TextRow label="VAT TIN No" fieldKey="vat_tin_no" form={form} setF={setF} />
                <TextRow label="VAT C.S.T. No" fieldKey="cst_no" form={form} setF={setF} />
                <TextRow label="GST No" fieldKey="gst_no" form={form} setF={setF} />
                <TextRow label="SAC No" fieldKey="sac_no" form={form} setF={setF} />
                <TextRow label="Database Name" fieldKey="database_name" form={form} setF={setF} />
                <TextRow label="DSN Name" fieldKey="dsn_name" form={form} setF={setF} />
              </div>
            )}

            {/* ── Tab: Special Info ── */}
            {activeTab === "special" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  <TextRow label="Bill Heading" fieldKey="bill_heading" form={form} setF={setF} />
                  <TextRow label="Special Message" fieldKey="special_message" form={form} setF={setF} />
                </div>
                <div className="border-t" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                  <div className="divide-y divide-border">
                    <SwitchRow label="Print Company Name on Bill" fieldKey="print_company_name_bill" form={form} setF={setF} />
                    <SwitchRow label="Print Address on Bill" fieldKey="print_address_yn" form={form} setF={setF} />
                    <SwitchRow label="Activate Printing After Saving KOT" fieldKey="print_after_save_kot" form={form} setF={setF} />
                    <SwitchRow label="Print Bill" fieldKey="print_bill_yn" form={form} setF={setF} />
                    <SwitchRow label="Print No. of Persons on Bill" fieldKey="print_no_of_person_bill" form={form} setF={setF} />
                    <SwitchRow label="Print Detail Bill" fieldKey="print_detail_bill" form={form} setF={setF} />
                    <SwitchRow label="Time on Bill" fieldKey="time_on_bill_yn" form={form} setF={setF} />
                    <SwitchRow label="Cash Drawer" fieldKey="cash_drawer_yn" form={form} setF={setF} />
                    <SwitchRow label="OTP For Change Rates" fieldKey="otp_rate_change_yn" form={form} setF={setF} />
                    <SwitchRow label="Allow Sharing" fieldKey="allow_sharing_yn" form={form} setF={setF} />
                    <SwitchRow label="Re-Print" fieldKey="reprint_yn" form={form} setF={setF} />
                  </div>
                  <div className="divide-y divide-border">
                    <SwitchRow label="Direct Bill" fieldKey="direct_bill_yn" form={form} setF={setF} />
                    <SwitchRow label="KOT Cancel" fieldKey="kot_cancel" form={form} setF={setF} />
                    <SwitchRow label="Multi User" fieldKey="multi_user" form={form} setF={setF} />
                    <SwitchRow label="Bill Settled" fieldKey="bill_settlement_yn" form={form} setF={setF} />
                    <SwitchRow label="Cancellation Message" fieldKey="cancellation_message_yn" form={form} setF={setF} />
                    <SwitchRow label="Print Token" fieldKey="print_token_yn" form={form} setF={setF} />
                    <SwitchRow label="Print Bill Footer" fieldKey="print_bill_footer_yn" form={form} setF={setF} />
                  </div>
                </div>
                <div className="border-t" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3 items-end">
                  <TogglePair label="Time Format" fieldKey="time_format"
                    options={[{ label: "12 Hrs", value: "12" }, { label: "24 Hrs", value: "24" }]}
                    form={form} setF={setF} />
                  <TogglePair label="Printer Setting" fieldKey="printer_setting"
                    options={[{ label: "TH", value: "TH" }, { label: "DT", value: "DT" }]}
                    form={form} setF={setF} />
                  <Field>
                    <FieldLabel className="text-sm text-muted-foreground">No. of Lines for KOT</FieldLabel>
                    <Input type="number" value={form.no_of_line_kot ?? 5}
                      onChange={(e) => setF("no_of_line_kot", e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm text-muted-foreground">No. of Lines Forward</FieldLabel>
                    <Input type="number" value={form.no_of_line_forward ?? 5}
                      onChange={(e) => setF("no_of_line_forward", Number(e.target.value))} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm text-muted-foreground">Parcel Sec Code</FieldLabel>
                    <Input type="number" value={form.parcel_sec_code ?? 1}
                      onChange={(e) => setF("parcel_sec_code", Number(e.target.value))} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm text-muted-foreground">Non Chargeable</FieldLabel>
                    <Input type="number" value={form.non_chargeable ?? 0}
                      onChange={(e) => setF("non_chargeable", Number(e.target.value))} />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Tab: Partner Detail ── */}
            {activeTab === "partner" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <TextRow label="Company Name" fieldKey="partner_company_name" form={form} setF={setF} />
                <TextRow label="End of Report" fieldKey="end_of_report" form={form} setF={setF} />
                <TextRow label="Address 1" fieldKey="partner_address1" form={form} setF={setF} />
                <TextRow label="Address 2" fieldKey="partner_address2" form={form} setF={setF} />
                <TextRow label="Address 3" fieldKey="partner_address3" form={form} setF={setF} />
                <div />
                <TextRow label="Phone No 1" fieldKey="partner_phone1" form={form} setF={setF} />
                <TextRow label="Phone No 2" fieldKey="partner_phone2" form={form} setF={setF} />
                <TextRow label="Email ID" fieldKey="partner_email" form={form} setF={setF} type="email" />
              </div>
            )}

            {/* ── Tab: Email / SMS ── */}
            {activeTab === "email_sms" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="md:col-span-2">
                  <SwitchRow label="Mail Active" fieldKey="mail_active_yn" form={form} setF={setF} />
                </div>
                <TextRow label="Mail ID" fieldKey="mail_id" form={form} setF={setF} type="email" />
                <TextRow label="Mail Password" fieldKey="mail_password" form={form} setF={setF} type="password" />
                <TextRow label="Mail Head" fieldKey="mail_head" form={form} setF={setF} />
                <TextRow label="Mail Body" fieldKey="mail_body" form={form} setF={setF} />
                <div className="md:col-span-2 grid grid-cols-2 gap-x-8">
                  <SwitchRow label="Send Mail to Guest" fieldKey="send_mail_guest_yn" form={form} setF={setF} />
                  <SwitchRow label="Send Mail to Company" fieldKey="send_mail_company_yn" form={form} setF={setF} />
                </div>
                <TextRow label="Receiver Email ID 1" fieldKey="receiver_email1" form={form} setF={setF} type="email" />
                <TextRow label="Receiver Email ID 2" fieldKey="receiver_email2" form={form} setF={setF} type="email" />
                <TextRow label="Receiver Email ID 3" fieldKey="receiver_email3" form={form} setF={setF} type="email" />
                <div />
                <div className="md:col-span-2 border-t pt-3">
                  <SwitchRow label="SMS Active" fieldKey="sms_active" form={form} setF={setF} />
                </div>
                <TextRow label="SMS Username" fieldKey="sms_user_name" form={form} setF={setF} />
                <TextRow label="SMS Password" fieldKey="sms_password" form={form} setF={setF} type="password" />
                <TextRow label="SMS Sender" fieldKey="sms_sender" form={form} setF={setF} />
              </div>
            )}

            {/* ── Tab: Parameter ── */}
            {activeTab === "param1" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                  <div className="divide-y divide-border">
                    <SwitchRow label="Waiter" fieldKey="waiter_yn" form={form} setF={setF} />
                    <SwitchRow label="Covers" fieldKey="covers_yn" form={form} setF={setF} />
                    <SwitchRow label="Modify Current Bill" fieldKey="modify_current_bill_yn" form={form} setF={setF} />
                    <SwitchRow label="Modify Settled Bill" fieldKey="modify_settled_bill_yn" form={form} setF={setF} />
                    <SwitchRow label="Complementary" fieldKey="complementary_yn" form={form} setF={setF} />
                    <SwitchRow label="Cancellation Message" fieldKey="cancellation_message_yn" form={form} setF={setF} />
                    <SwitchRow label="Print Token" fieldKey="print_token_yn" form={form} setF={setF} />
                    <SwitchRow label="Print Bill Footer" fieldKey="print_bill_footer_yn" form={form} setF={setF} />
                    <SwitchRow label="Print Receipt No" fieldKey="print_receipt_no_yn" form={form} setF={setF} />
                    <SwitchRow label="Sale Ratewise" fieldKey="sale_ratewise_yn" form={form} setF={setF} />
                  </div>
                  <div className="divide-y divide-border">
                    <SwitchRow label="Bill Closed" fieldKey="bill_closed_yn" form={form} setF={setF} />
                    <SwitchRow label="Print Table No on Bill" fieldKey="print_table_no_yn" form={form} setF={setF} />
                    <SwitchRow label="Print Company Logo" fieldKey="print_company_logo_yn" form={form} setF={setF} />
                    <SwitchRow label="Include Tax" fieldKey="include_tax_yn" form={form} setF={setF} />
                    <SwitchRow label="Print GST Serial No" fieldKey="print_gst_serial_no_yn" form={form} setF={setF} />
                    <SwitchRow label="Allow Lodge Posting" fieldKey="allow_lodge_posting" form={form} setF={setF} />
                  </div>
                </div>
                <div className="border-t" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                  <NumField label="Outlet Printer Food" fieldKey="outlet_printer_food" form={form} setF={setF} />
                  <NumField label="Outlet Printer Liquor" fieldKey="outlet_printer_liquor" form={form} setF={setF} />
                  <NumField label="Max Qty" fieldKey="max_qty" form={form} setF={setF} />
                  <TextRow label="Domain Name" fieldKey="domain_name" form={form} setF={setF} />
                  <TextRow label="Pay UPI ID" fieldKey="pay_upi_id" form={form} setF={setF} />
                  <TextRow label="Backup Path" fieldKey="backup_path_name" form={form} setF={setF} placeholder="e.g. E" />
                </div>
              </div>
            )}

            {/* ── Tab: Parameter 2 ── */}
            {activeTab === "param2" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
                  <TextRow label="Sale JV Ledger Name" fieldKey="sale_jv_ledger" form={form} setF={setF} placeholder="e.g. Sale Control Account" />
                  <TextRow label="JV Ledger Name" fieldKey="jv_ledger" form={form} setF={setF} placeholder="e.g. Cash" />
                  <TextRow label="RoundOff Ledger Name" fieldKey="roundoff_ledger" form={form} setF={setF} placeholder="e.g. RoundOff" />
                </div>
                <div className="border-t" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                  <div className="divide-y divide-border">
                    <SwitchRow label="Barcode" fieldKey="barcode_yn" form={form} setF={setF} />
                    <SwitchRow label="Online Direct Bill" fieldKey="online_direct_bill" form={form} setF={setF} />
                    <SwitchRow label="Multiple Order" fieldKey="multiple_order_yn" form={form} setF={setF} />
                  </div>
                  <div className="divide-y divide-border">
                    <SwitchRow label="Online Order" fieldKey="online_order_yn" form={form} setF={setF} />
                    <SwitchRow label="Time on KOT" fieldKey="time_on_kot_yn" form={form} setF={setF} />
                  </div>
                </div>
                <div className="border-t" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                  <NumField label="Search Type" fieldKey="search_type" form={form} setF={setF} />
                  <TextRow label="Online Merchant ID" fieldKey="online_merchant_id" form={form} setF={setF} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

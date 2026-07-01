use crate::{acquire_pool, AppState};
use serde::{Deserialize, Deserializer, Serialize};
use sqlx::Row;

// Accept null, "", or a real byte array for company_logo. The frontend may send
// an empty string when the field is untouched; treat that as no logo (None)
// instead of failing deserialization with "expected a sequence".
fn de_logo<'de, D>(deserializer: D) -> Result<Option<Vec<u8>>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum LogoInput {
        Bytes(Vec<u8>),
        Str(String),
        Null,
    }

    Ok(match Option::<LogoInput>::deserialize(deserializer)? {
        Some(LogoInput::Bytes(b)) if !b.is_empty() => Some(b),
        _ => None,
    })
}

// ─────────────────────────────────────────────────────────────
// Struct — every column in company_details table
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct CompanyDetails {
    // Original columns
    pub company_name: Option<String>,
    #[serde(default, deserialize_with = "de_logo")]
    pub company_logo: Option<Vec<u8>>,
    pub logo_file_name: Option<String>,
    pub logo_name: Option<String>,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub address_line3: Option<String>,
    pub phone_no1: Option<String>,
    pub phone_no2: Option<String>,
    pub fax_no: Option<String>,
    pub email_id: Option<String>,
    pub sms_active: Option<String>,
    pub xp_version_yn: Option<String>,
    pub sms_user_name: Option<String>,
    pub sms_password: Option<String>,
    pub sms_sender: Option<String>,
    pub receiver_email1: Option<String>,
    pub receiver_email2: Option<String>,
    pub licenses_no: Option<String>,
    pub licenses_date: Option<String>,
    pub registration_key: Option<String>,
    pub gst_serial_no: Option<String>,
    pub multi_user: Option<String>,
    pub vat_tin_no: Option<String>,
    pub service_tax_no: Option<String>,
    pub cst_no: Option<String>,
    pub luxury_tax_no: Option<String>,
    pub pan_no: Option<String>,
    pub database_name: Option<String>,
    pub dsn_name: Option<String>,
    pub database_path: Option<String>,
    pub parent: Option<String>,
    pub it_pan_no: Option<String>,
    pub print_option: Option<String>,
    pub gst_no: Option<String>,
    pub sac_no: Option<String>,
    pub bank_detail: Option<String>,
    pub bill_heading: Option<String>,
    pub special_message: Option<String>,
    pub check_out_12_24: Option<String>,
    pub print_company_name_bill: Option<String>,
    pub print_address_yn: Option<String>,
    pub print_after_save_kot: Option<String>,
    pub print_bill_yn: Option<String>,
    pub print_no_of_person_bill: Option<String>,
    pub print_detail_bill: Option<String>,
    pub time_on_bill_yn: Option<String>,
    pub allow_delay: Option<String>,
    pub page_length_bill: Option<String>,
    pub no_of_line_kot: Option<String>,
    pub allow_sharing_yn: Option<String>,
    pub service_tax_per: Option<f64>,
    pub reprint_yn: Option<String>,
    pub kot_cancel: Option<String>,
    pub no_of_line_forward: Option<i32>,
    pub no_of_line_backward: Option<i32>,
    pub mail_active_yn: Option<String>,
    pub mail_id: Option<String>,
    pub mail_password: Option<String>,
    pub mail_head: Option<String>,
    pub mail_body: Option<String>,
    pub send_mail_guest_yn: Option<String>,
    pub send_mail_company_yn: Option<String>,
    pub sale_ref_no_yn: Option<String>,
    pub print_room_tariff_bill_yn: Option<String>,
    pub per_head_tariff_bill_yn: Option<String>,
    pub multi_room_tariff_total_pax: Option<String>,
    pub tax_after_discount_yn: Option<String>,
    pub mobile_no1: Option<String>,
    pub mobile_no2: Option<String>,
    pub mobile_no3: Option<String>,
    pub total_discount_gl_code: Option<String>,
    pub extra_person: Option<i32>,
    pub check_out_time: Option<String>,
    pub checkout_yn: Option<String>,
    pub room_service: Option<String>,
    pub check_in_time: Option<String>,
    pub restaurant_sale: Option<String>,
    pub tally_voucher_type: Option<String>,
    pub luxury_tax_master_code: Option<i32>,
    pub bill_settlement_yn: Option<String>,
    pub service_tax_master_code: Option<i32>,
    pub print_sale_crystal_report_yn: Option<String>,
    pub call_record_filepath: Option<String>,
    pub auto_ref_no_yn: Option<String>,
    pub phone_call_group_id: Option<String>,
    pub detail_bill_report_yn: Option<String>,
    pub phone_call_item_id: Option<String>,
    pub separate_bill_no_yn: Option<String>,
    pub total_discount_tally_code: Option<String>,
    pub capillary_file_yn: Option<String>,
    pub room_service_direct_per: Option<String>,
    pub locking_system_yn: Option<String>,
    pub locking_authorization: Option<String>,
    pub default_ledger_id: Option<String>,
    pub default_guest_id: Option<String>,
    pub time_for_wifi: Option<String>,
    pub ip_address_for_wifi: Option<String>,
    pub port_no_for_wifi: Option<String>,
    pub user_name_for_wifi: Option<String>,
    pub password_for_wifi: Option<String>,
    pub extra_bed_group_id: Option<String>,
    pub print_gst_serial_no_yn: Option<String>,
    pub backup_path_name: Option<String>,
    pub separate_rest_direct_yn: Option<String>,
    pub service_place: Option<String>,
    pub print_company_logo_yn: Option<String>,
    // Additional columns
    pub company_name2: Option<String>,
    pub name2: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub fssai_no: Option<String>,
    pub print_name_address: Option<String>,
    pub receiver_email3: Option<String>,
    pub cash_drawer_yn: Option<String>,
    pub otp_rate_change_yn: Option<String>,
    pub direct_bill_yn: Option<String>,
    pub time_format: Option<String>,
    pub cancellation_message_yn: Option<String>,
    pub print_token_yn: Option<String>,
    pub print_bill_footer_yn: Option<String>,
    pub printer_setting: Option<String>,
    pub parcel_sec_code: Option<i32>,
    pub non_chargeable: Option<i32>,
    pub partner_company_name: Option<String>,
    pub partner_address1: Option<String>,
    pub partner_address2: Option<String>,
    pub partner_address3: Option<String>,
    pub partner_phone1: Option<String>,
    pub partner_phone2: Option<String>,
    pub partner_email: Option<String>,
    pub end_of_report: Option<String>,
    pub waiter_yn: Option<String>,
    pub covers_yn: Option<String>,
    pub outlet_printer_food: Option<i32>,
    pub outlet_printer_liquor: Option<i32>,
    pub max_qty: Option<i32>,
    pub modify_current_bill_yn: Option<String>,
    pub modify_settled_bill_yn: Option<String>,
    pub complementary_yn: Option<String>,
    pub bill_closed_yn: Option<String>,
    pub print_table_no_yn: Option<String>,
    pub include_tax_yn: Option<String>,
    pub allow_lodge_posting: Option<String>,
    pub domain_name: Option<String>,
    pub pay_upi_id: Option<String>,
    pub print_receipt_no_yn: Option<String>,
    pub sale_ratewise_yn: Option<String>,
    pub sale_jv_ledger: Option<String>,
    pub jv_ledger: Option<String>,
    pub roundoff_ledger: Option<String>,
    pub barcode_yn: Option<String>,
    pub search_type: Option<i32>,
    pub online_order_yn: Option<String>,
    pub online_merchant_id: Option<String>,
    pub online_direct_bill: Option<String>,
    pub time_on_kot_yn: Option<String>,
    pub multiple_order_yn: Option<String>,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_company_details(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<CompanyDetails, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        r#"SELECT
            company_name, logo_file_name, logo_name,
            address_line1, address_line2, address_line3,
            phone_no1, phone_no2, fax_no, email_id,
            sms_active, xp_version_yn, sms_user_name, sms_password, sms_sender,
            receiver_email1, receiver_email2,
            licenses_no, licenses_date::TEXT, registration_key, gst_serial_no,
            multi_user, vat_tin_no, service_tax_no, cst_no, luxury_tax_no, pan_no,
            database_name, dsn_name, database_path, parent, it_pan_no, print_option,
            gst_no, sac_no, bank_detail, bill_heading, special_message,
            check_out_12_24, print_company_name_bill, print_address_yn,
            print_after_save_kot, print_bill_yn, print_no_of_person_bill,
            print_detail_bill, time_on_bill_yn, allow_delay, page_length_bill,
            no_of_line_kot, allow_sharing_yn, service_tax_per,
            reprint_yn, kot_cancel, no_of_line_forward, no_of_line_backward,
            mail_active_yn, mail_id, mail_password, mail_head, mail_body,
            send_mail_guest_yn, send_mail_company_yn,
            sale_ref_no_yn, print_room_tariff_bill_yn, per_head_tariff_bill_yn,
            multi_room_tariff_total_pax, tax_after_discount_yn,
            mobile_no1, mobile_no2, mobile_no3, total_discount_gl_code, extra_person,
            check_out_time::TEXT, checkout_yn, room_service, check_in_time::TEXT,
            restaurant_sale, tally_voucher_type,
            luxury_tax_master_code, bill_settlement_yn, service_tax_master_code,
            print_sale_crystal_report_yn, call_record_filepath, auto_ref_no_yn,
            phone_call_group_id, detail_bill_report_yn, phone_call_item_id,
            separate_bill_no_yn, total_discount_tally_code, capillary_file_yn,
            room_service_direct_per, locking_system_yn, locking_authorization,
            default_ledger_id, default_guest_id, time_for_wifi, ip_address_for_wifi,
            port_no_for_wifi, user_name_for_wifi, password_for_wifi, extra_bed_group_id,
            print_gst_serial_no_yn, backup_path_name, separate_rest_direct_yn,
            service_place, print_company_logo_yn,
            company_name2, name2, start_date::TEXT, end_date::TEXT,
            fssai_no, print_name_address, receiver_email3,
            cash_drawer_yn, otp_rate_change_yn, direct_bill_yn, time_format,
            cancellation_message_yn, print_token_yn, print_bill_footer_yn,
            printer_setting, parcel_sec_code, non_chargeable,
            partner_company_name, partner_address1, partner_address2, partner_address3,
            partner_phone1, partner_phone2, partner_email, end_of_report,
            waiter_yn, covers_yn, outlet_printer_food, outlet_printer_liquor, max_qty,
            modify_current_bill_yn, modify_settled_bill_yn, complementary_yn,
            bill_closed_yn, print_table_no_yn, include_tax_yn,
            allow_lodge_posting, domain_name, pay_upi_id,
            print_receipt_no_yn, sale_ratewise_yn,
            sale_jv_ledger, jv_ledger, roundoff_ledger,
            barcode_yn, search_type, online_order_yn, online_merchant_id,
            online_direct_bill, time_on_kot_yn, multiple_order_yn
        FROM company_details WHERE id = 1"#,
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let Some(r) = row else {
        return Ok(CompanyDetails::default());
    };

    Ok(CompanyDetails {
        company_name: r.try_get("company_name").ok().flatten(),
        company_logo: None, // BYTEA handled separately if needed
        logo_file_name: r.try_get("logo_file_name").ok().flatten(),
        logo_name: r.try_get("logo_name").ok().flatten(),
        address_line1: r.try_get("address_line1").ok().flatten(),
        address_line2: r.try_get("address_line2").ok().flatten(),
        address_line3: r.try_get("address_line3").ok().flatten(),
        phone_no1: r.try_get("phone_no1").ok().flatten(),
        phone_no2: r.try_get("phone_no2").ok().flatten(),
        fax_no: r.try_get("fax_no").ok().flatten(),
        email_id: r.try_get("email_id").ok().flatten(),
        sms_active: r.try_get("sms_active").ok().flatten(),
        xp_version_yn: r.try_get("xp_version_yn").ok().flatten(),
        sms_user_name: r.try_get("sms_user_name").ok().flatten(),
        sms_password: r.try_get("sms_password").ok().flatten(),
        sms_sender: r.try_get("sms_sender").ok().flatten(),
        receiver_email1: r.try_get("receiver_email1").ok().flatten(),
        receiver_email2: r.try_get("receiver_email2").ok().flatten(),
        licenses_no: r.try_get("licenses_no").ok().flatten(),
        licenses_date: r.try_get("licenses_date").ok().flatten(),
        registration_key: r.try_get("registration_key").ok().flatten(),
        gst_serial_no: r.try_get("gst_serial_no").ok().flatten(),
        multi_user: r.try_get("multi_user").ok().flatten(),
        vat_tin_no: r.try_get("vat_tin_no").ok().flatten(),
        service_tax_no: r.try_get("service_tax_no").ok().flatten(),
        cst_no: r.try_get("cst_no").ok().flatten(),
        luxury_tax_no: r.try_get("luxury_tax_no").ok().flatten(),
        pan_no: r.try_get("pan_no").ok().flatten(),
        database_name: r.try_get("database_name").ok().flatten(),
        dsn_name: r.try_get("dsn_name").ok().flatten(),
        database_path: r.try_get("database_path").ok().flatten(),
        parent: r.try_get("parent").ok().flatten(),
        it_pan_no: r.try_get("it_pan_no").ok().flatten(),
        print_option: r.try_get("print_option").ok().flatten(),
        gst_no: r.try_get("gst_no").ok().flatten(),
        sac_no: r.try_get("sac_no").ok().flatten(),
        bank_detail: r.try_get("bank_detail").ok().flatten(),
        bill_heading: r.try_get("bill_heading").ok().flatten(),
        special_message: r.try_get("special_message").ok().flatten(),
        check_out_12_24: r.try_get("check_out_12_24").ok().flatten(),
        print_company_name_bill: r.try_get("print_company_name_bill").ok().flatten(),
        print_address_yn: r.try_get("print_address_yn").ok().flatten(),
        print_after_save_kot: r.try_get("print_after_save_kot").ok().flatten(),
        print_bill_yn: r.try_get("print_bill_yn").ok().flatten(),
        print_no_of_person_bill: r.try_get("print_no_of_person_bill").ok().flatten(),
        print_detail_bill: r.try_get("print_detail_bill").ok().flatten(),
        time_on_bill_yn: r.try_get("time_on_bill_yn").ok().flatten(),
        allow_delay: r.try_get("allow_delay").ok().flatten(),
        page_length_bill: r.try_get("page_length_bill").ok().flatten(),
        no_of_line_kot: r.try_get("no_of_line_kot").ok().flatten(),
        allow_sharing_yn: r.try_get("allow_sharing_yn").ok().flatten(),
        service_tax_per: r.try_get("service_tax_per").ok().flatten(),
        reprint_yn: r.try_get("reprint_yn").ok().flatten(),
        kot_cancel: r.try_get("kot_cancel").ok().flatten(),
        no_of_line_forward: r.try_get("no_of_line_forward").ok().flatten(),
        no_of_line_backward: r.try_get("no_of_line_backward").ok().flatten(),
        mail_active_yn: r.try_get("mail_active_yn").ok().flatten(),
        mail_id: r.try_get("mail_id").ok().flatten(),
        mail_password: r.try_get("mail_password").ok().flatten(),
        mail_head: r.try_get("mail_head").ok().flatten(),
        mail_body: r.try_get("mail_body").ok().flatten(),
        send_mail_guest_yn: r.try_get("send_mail_guest_yn").ok().flatten(),
        send_mail_company_yn: r.try_get("send_mail_company_yn").ok().flatten(),
        sale_ref_no_yn: r.try_get("sale_ref_no_yn").ok().flatten(),
        print_room_tariff_bill_yn: r.try_get("print_room_tariff_bill_yn").ok().flatten(),
        per_head_tariff_bill_yn: r.try_get("per_head_tariff_bill_yn").ok().flatten(),
        multi_room_tariff_total_pax: r.try_get("multi_room_tariff_total_pax").ok().flatten(),
        tax_after_discount_yn: r.try_get("tax_after_discount_yn").ok().flatten(),
        mobile_no1: r.try_get("mobile_no1").ok().flatten(),
        mobile_no2: r.try_get("mobile_no2").ok().flatten(),
        mobile_no3: r.try_get("mobile_no3").ok().flatten(),
        total_discount_gl_code: r.try_get("total_discount_gl_code").ok().flatten(),
        extra_person: r.try_get("extra_person").ok().flatten(),
        check_out_time: r.try_get("check_out_time").ok().flatten(),
        checkout_yn: r.try_get("checkout_yn").ok().flatten(),
        room_service: r.try_get("room_service").ok().flatten(),
        check_in_time: r.try_get("check_in_time").ok().flatten(),
        restaurant_sale: r.try_get("restaurant_sale").ok().flatten(),
        tally_voucher_type: r.try_get("tally_voucher_type").ok().flatten(),
        luxury_tax_master_code: r.try_get("luxury_tax_master_code").ok().flatten(),
        bill_settlement_yn: r.try_get("bill_settlement_yn").ok().flatten(),
        service_tax_master_code: r.try_get("service_tax_master_code").ok().flatten(),
        print_sale_crystal_report_yn: r.try_get("print_sale_crystal_report_yn").ok().flatten(),
        call_record_filepath: r.try_get("call_record_filepath").ok().flatten(),
        auto_ref_no_yn: r.try_get("auto_ref_no_yn").ok().flatten(),
        phone_call_group_id: r.try_get("phone_call_group_id").ok().flatten(),
        detail_bill_report_yn: r.try_get("detail_bill_report_yn").ok().flatten(),
        phone_call_item_id: r.try_get("phone_call_item_id").ok().flatten(),
        separate_bill_no_yn: r.try_get("separate_bill_no_yn").ok().flatten(),
        total_discount_tally_code: r.try_get("total_discount_tally_code").ok().flatten(),
        capillary_file_yn: r.try_get("capillary_file_yn").ok().flatten(),
        room_service_direct_per: r.try_get("room_service_direct_per").ok().flatten(),
        locking_system_yn: r.try_get("locking_system_yn").ok().flatten(),
        locking_authorization: r.try_get("locking_authorization").ok().flatten(),
        default_ledger_id: r.try_get("default_ledger_id").ok().flatten(),
        default_guest_id: r.try_get("default_guest_id").ok().flatten(),
        time_for_wifi: r.try_get("time_for_wifi").ok().flatten(),
        ip_address_for_wifi: r.try_get("ip_address_for_wifi").ok().flatten(),
        port_no_for_wifi: r.try_get("port_no_for_wifi").ok().flatten(),
        user_name_for_wifi: r.try_get("user_name_for_wifi").ok().flatten(),
        password_for_wifi: r.try_get("password_for_wifi").ok().flatten(),
        extra_bed_group_id: r.try_get("extra_bed_group_id").ok().flatten(),
        print_gst_serial_no_yn: r.try_get("print_gst_serial_no_yn").ok().flatten(),
        backup_path_name: r.try_get("backup_path_name").ok().flatten(),
        separate_rest_direct_yn: r.try_get("separate_rest_direct_yn").ok().flatten(),
        service_place: r.try_get("service_place").ok().flatten(),
        print_company_logo_yn: r.try_get("print_company_logo_yn").ok().flatten(),
        company_name2: r.try_get("company_name2").ok().flatten(),
        name2: r.try_get("name2").ok().flatten(),
        start_date: r.try_get("start_date").ok().flatten(),
        end_date: r.try_get("end_date").ok().flatten(),
        fssai_no: r.try_get("fssai_no").ok().flatten(),
        print_name_address: r.try_get("print_name_address").ok().flatten(),
        receiver_email3: r.try_get("receiver_email3").ok().flatten(),
        cash_drawer_yn: r.try_get("cash_drawer_yn").ok().flatten(),
        otp_rate_change_yn: r.try_get("otp_rate_change_yn").ok().flatten(),
        direct_bill_yn: r.try_get("direct_bill_yn").ok().flatten(),
        time_format: r.try_get("time_format").ok().flatten(),
        cancellation_message_yn: r.try_get("cancellation_message_yn").ok().flatten(),
        print_token_yn: r.try_get("print_token_yn").ok().flatten(),
        print_bill_footer_yn: r.try_get("print_bill_footer_yn").ok().flatten(),
        printer_setting: r.try_get("printer_setting").ok().flatten(),
        parcel_sec_code: r.try_get("parcel_sec_code").ok().flatten(),
        non_chargeable: r.try_get("non_chargeable").ok().flatten(),
        partner_company_name: r.try_get("partner_company_name").ok().flatten(),
        partner_address1: r.try_get("partner_address1").ok().flatten(),
        partner_address2: r.try_get("partner_address2").ok().flatten(),
        partner_address3: r.try_get("partner_address3").ok().flatten(),
        partner_phone1: r.try_get("partner_phone1").ok().flatten(),
        partner_phone2: r.try_get("partner_phone2").ok().flatten(),
        partner_email: r.try_get("partner_email").ok().flatten(),
        end_of_report: r.try_get("end_of_report").ok().flatten(),
        waiter_yn: r.try_get("waiter_yn").ok().flatten(),
        covers_yn: r.try_get("covers_yn").ok().flatten(),
        outlet_printer_food: r.try_get("outlet_printer_food").ok().flatten(),
        outlet_printer_liquor: r.try_get("outlet_printer_liquor").ok().flatten(),
        max_qty: r.try_get("max_qty").ok().flatten(),
        modify_current_bill_yn: r.try_get("modify_current_bill_yn").ok().flatten(),
        modify_settled_bill_yn: r.try_get("modify_settled_bill_yn").ok().flatten(),
        complementary_yn: r.try_get("complementary_yn").ok().flatten(),
        bill_closed_yn: r.try_get("bill_closed_yn").ok().flatten(),
        print_table_no_yn: r.try_get("print_table_no_yn").ok().flatten(),
        include_tax_yn: r.try_get("include_tax_yn").ok().flatten(),
        allow_lodge_posting: r.try_get("allow_lodge_posting").ok().flatten(),
        domain_name: r.try_get("domain_name").ok().flatten(),
        pay_upi_id: r.try_get("pay_upi_id").ok().flatten(),
        print_receipt_no_yn: r.try_get("print_receipt_no_yn").ok().flatten(),
        sale_ratewise_yn: r.try_get("sale_ratewise_yn").ok().flatten(),
        sale_jv_ledger: r.try_get("sale_jv_ledger").ok().flatten(),
        jv_ledger: r.try_get("jv_ledger").ok().flatten(),
        roundoff_ledger: r.try_get("roundoff_ledger").ok().flatten(),
        barcode_yn: r.try_get("barcode_yn").ok().flatten(),
        search_type: r.try_get("search_type").ok().flatten(),
        online_order_yn: r.try_get("online_order_yn").ok().flatten(),
        online_merchant_id: r.try_get("online_merchant_id").ok().flatten(),
        online_direct_bill: r.try_get("online_direct_bill").ok().flatten(),
        time_on_kot_yn: r.try_get("time_on_kot_yn").ok().flatten(),
        multiple_order_yn: r.try_get("multiple_order_yn").ok().flatten(),
    })
}

#[tauri::command]
pub async fn save_company_details(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    data: CompanyDetails,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        r#"INSERT INTO company_details (
            id,
            company_name, logo_file_name, logo_name,
            address_line1, address_line2, address_line3,
            phone_no1, phone_no2, fax_no, email_id,
            sms_active, xp_version_yn, sms_user_name, sms_password, sms_sender,
            receiver_email1, receiver_email2,
            licenses_no, licenses_date, registration_key, gst_serial_no,
            multi_user, vat_tin_no, service_tax_no, cst_no, luxury_tax_no, pan_no,
            database_name, dsn_name, database_path, parent, it_pan_no, print_option,
            gst_no, sac_no, bank_detail, bill_heading, special_message,
            check_out_12_24, print_company_name_bill, print_address_yn,
            print_after_save_kot, print_bill_yn, print_no_of_person_bill,
            print_detail_bill, time_on_bill_yn, allow_delay, page_length_bill,
            no_of_line_kot, allow_sharing_yn, service_tax_per,
            reprint_yn, kot_cancel, no_of_line_forward, no_of_line_backward,
            mail_active_yn, mail_id, mail_password, mail_head, mail_body,
            send_mail_guest_yn, send_mail_company_yn,
            sale_ref_no_yn, print_room_tariff_bill_yn, per_head_tariff_bill_yn,
            multi_room_tariff_total_pax, tax_after_discount_yn,
            mobile_no1, mobile_no2, mobile_no3, total_discount_gl_code, extra_person,
            check_out_time, checkout_yn, room_service, check_in_time,
            restaurant_sale, tally_voucher_type,
            luxury_tax_master_code, bill_settlement_yn, service_tax_master_code,
            print_sale_crystal_report_yn, call_record_filepath, auto_ref_no_yn,
            phone_call_group_id, detail_bill_report_yn, phone_call_item_id,
            separate_bill_no_yn, total_discount_tally_code, capillary_file_yn,
            room_service_direct_per, locking_system_yn, locking_authorization,
            default_ledger_id, default_guest_id, time_for_wifi, ip_address_for_wifi,
            port_no_for_wifi, user_name_for_wifi, password_for_wifi, extra_bed_group_id,
            print_gst_serial_no_yn, backup_path_name, separate_rest_direct_yn,
            service_place, print_company_logo_yn,
            company_name2, name2, start_date, end_date,
            fssai_no, print_name_address, receiver_email3,
            cash_drawer_yn, otp_rate_change_yn, direct_bill_yn, time_format,
            cancellation_message_yn, print_token_yn, print_bill_footer_yn,
            printer_setting, parcel_sec_code, non_chargeable,
            partner_company_name, partner_address1, partner_address2, partner_address3,
            partner_phone1, partner_phone2, partner_email, end_of_report,
            waiter_yn, covers_yn, outlet_printer_food, outlet_printer_liquor, max_qty,
            modify_current_bill_yn, modify_settled_bill_yn, complementary_yn,
            bill_closed_yn, print_table_no_yn, include_tax_yn,
            allow_lodge_posting, domain_name, pay_upi_id,
            print_receipt_no_yn, sale_ratewise_yn,
            sale_jv_ledger, jv_ledger, roundoff_ledger,
            barcode_yn, search_type, online_order_yn, online_merchant_id,
            online_direct_bill, time_on_kot_yn, multiple_order_yn
        ) VALUES (
            1,
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
            NULLIF($19,'')::TIMESTAMP,
            $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
            $37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,
            $54,$55,$56,$57,$58,$59,$60,$61,$62,$63,$64,$65,$66,$67,$68,$69,$70,
            $71,$72,
            NULLIF($73,'')::TIMESTAMP,
            $74,$75,
            NULLIF($76,'')::TIMESTAMP,
            $77,$78,$79,$80,$81,$82,$83,$84,$85,$86,$87,
            $88,$89,$90,$91,$92,$93,$94,$95,$96,$97,$98,$99,$100,$101,$102,$103,
            $104,$105,$106,$107,$108,
            NULLIF($109,'')::DATE,
            NULLIF($110,'')::DATE,
            $111,$112,$113,$114,$115,$116,$117,
            $118,$119,$120,$121,$122,$123,$124,$125,$126,$127,$128,$129,$130,$131,
            $132,$133,$134,$135,$136,$137,$138,$139,$140,$141,$142,$143,$144,$145,
            $146,$147,$148,$149,$150,$151,$152,$153,$154,$155,$156,$157
        )
        ON CONFLICT (id) DO UPDATE SET
            company_name=$1, logo_file_name=$2, logo_name=$3,
            address_line1=$4, address_line2=$5, address_line3=$6,
            phone_no1=$7, phone_no2=$8, fax_no=$9, email_id=$10,
            sms_active=$11, xp_version_yn=$12, sms_user_name=$13, sms_password=$14, sms_sender=$15,
            receiver_email1=$16, receiver_email2=$17,
            licenses_no=$18, licenses_date=NULLIF($19,'')::TIMESTAMP, registration_key=$20, gst_serial_no=$21,
            multi_user=$22, vat_tin_no=$23, service_tax_no=$24, cst_no=$25, luxury_tax_no=$26, pan_no=$27,
            database_name=$28, dsn_name=$29, database_path=$30, parent=$31, it_pan_no=$32, print_option=$33,
            gst_no=$34, sac_no=$35, bank_detail=$36, bill_heading=$37, special_message=$38,
            check_out_12_24=$39, print_company_name_bill=$40, print_address_yn=$41,
            print_after_save_kot=$42, print_bill_yn=$43, print_no_of_person_bill=$44,
            print_detail_bill=$45, time_on_bill_yn=$46, allow_delay=$47, page_length_bill=$48,
            no_of_line_kot=$49, allow_sharing_yn=$50, service_tax_per=$51,
            reprint_yn=$52, kot_cancel=$53, no_of_line_forward=$54, no_of_line_backward=$55,
            mail_active_yn=$56, mail_id=$57, mail_password=$58, mail_head=$59, mail_body=$60,
            send_mail_guest_yn=$61, send_mail_company_yn=$62,
            sale_ref_no_yn=$63, print_room_tariff_bill_yn=$64, per_head_tariff_bill_yn=$65,
            multi_room_tariff_total_pax=$66, tax_after_discount_yn=$67,
            mobile_no1=$68, mobile_no2=$69, mobile_no3=$70, total_discount_gl_code=$71, extra_person=$72,
            check_out_time=NULLIF($73,'')::TIMESTAMP, checkout_yn=$74, room_service=$75, check_in_time=NULLIF($76,'')::TIMESTAMP,
            restaurant_sale=$77, tally_voucher_type=$78,
            luxury_tax_master_code=$79, bill_settlement_yn=$80, service_tax_master_code=$81,
            print_sale_crystal_report_yn=$82, call_record_filepath=$83, auto_ref_no_yn=$84,
            phone_call_group_id=$85, detail_bill_report_yn=$86, phone_call_item_id=$87,
            separate_bill_no_yn=$88, total_discount_tally_code=$89, capillary_file_yn=$90,
            room_service_direct_per=$91, locking_system_yn=$92, locking_authorization=$93,
            default_ledger_id=$94, default_guest_id=$95, time_for_wifi=$96, ip_address_for_wifi=$97,
            port_no_for_wifi=$98, user_name_for_wifi=$99, password_for_wifi=$100, extra_bed_group_id=$101,
            print_gst_serial_no_yn=$102, backup_path_name=$103, separate_rest_direct_yn=$104,
            service_place=$105, print_company_logo_yn=$106,
            company_name2=$107, name2=$108, start_date=NULLIF($109,'')::DATE, end_date=NULLIF($110,'')::DATE,
            fssai_no=$111, print_name_address=$112, receiver_email3=$113,
            cash_drawer_yn=$114, otp_rate_change_yn=$115, direct_bill_yn=$116, time_format=$117,
            cancellation_message_yn=$118, print_token_yn=$119, print_bill_footer_yn=$120,
            printer_setting=$121, parcel_sec_code=$122, non_chargeable=$123,
            partner_company_name=$124, partner_address1=$125, partner_address2=$126, partner_address3=$127,
            partner_phone1=$128, partner_phone2=$129, partner_email=$130, end_of_report=$131,
            waiter_yn=$132, covers_yn=$133, outlet_printer_food=$134, outlet_printer_liquor=$135, max_qty=$136,
            modify_current_bill_yn=$137, modify_settled_bill_yn=$138, complementary_yn=$139,
            bill_closed_yn=$140, print_table_no_yn=$141, include_tax_yn=$142,
            allow_lodge_posting=$143, domain_name=$144, pay_upi_id=$145,
            print_receipt_no_yn=$146, sale_ratewise_yn=$147,
            sale_jv_ledger=$148, jv_ledger=$149, roundoff_ledger=$150,
            barcode_yn=$151, search_type=$152, online_order_yn=$153, online_merchant_id=$154,
            online_direct_bill=$155, time_on_kot_yn=$156, multiple_order_yn=$157,
            updated_at=CURRENT_TIMESTAMP"#,
    )
    .bind(&data.company_name)        // $1
    .bind(&data.logo_file_name)      // $2
    .bind(&data.logo_name)           // $3
    .bind(&data.address_line1)       // $4
    .bind(&data.address_line2)       // $5
    .bind(&data.address_line3)       // $6
    .bind(&data.phone_no1)           // $7
    .bind(&data.phone_no2)           // $8
    .bind(&data.fax_no)              // $9
    .bind(&data.email_id)            // $10
    .bind(&data.sms_active)          // $11
    .bind(&data.xp_version_yn)       // $12
    .bind(&data.sms_user_name)       // $13
    .bind(&data.sms_password)        // $14
    .bind(&data.sms_sender)          // $15
    .bind(&data.receiver_email1)     // $16
    .bind(&data.receiver_email2)     // $17
    .bind(&data.licenses_no)         // $18
    .bind(&data.licenses_date)       // $19
    .bind(&data.registration_key)    // $20
    .bind(&data.gst_serial_no)       // $21
    .bind(&data.multi_user)          // $22
    .bind(&data.vat_tin_no)          // $23
    .bind(&data.service_tax_no)      // $24
    .bind(&data.cst_no)              // $25
    .bind(&data.luxury_tax_no)       // $26
    .bind(&data.pan_no)              // $27
    .bind(&data.database_name)       // $28
    .bind(&data.dsn_name)            // $29
    .bind(&data.database_path)       // $30
    .bind(&data.parent)              // $31
    .bind(&data.it_pan_no)           // $32
    .bind(&data.print_option)        // $33
    .bind(&data.gst_no)              // $34
    .bind(&data.sac_no)              // $35
    .bind(&data.bank_detail)         // $36
    .bind(&data.bill_heading)        // $37
    .bind(&data.special_message)     // $38
    .bind(&data.check_out_12_24)     // $39
    .bind(&data.print_company_name_bill) // $40
    .bind(&data.print_address_yn)    // $41
    .bind(&data.print_after_save_kot) // $42
    .bind(&data.print_bill_yn)       // $43
    .bind(&data.print_no_of_person_bill) // $44
    .bind(&data.print_detail_bill)   // $45
    .bind(&data.time_on_bill_yn)     // $46
    .bind(&data.allow_delay)         // $47
    .bind(&data.page_length_bill)    // $48
    .bind(&data.no_of_line_kot)      // $49
    .bind(&data.allow_sharing_yn)    // $50
    .bind(data.service_tax_per)      // $51
    .bind(&data.reprint_yn)          // $52
    .bind(&data.kot_cancel)          // $53
    .bind(data.no_of_line_forward)   // $54
    .bind(data.no_of_line_backward)  // $55
    .bind(&data.mail_active_yn)      // $56
    .bind(&data.mail_id)             // $57
    .bind(&data.mail_password)       // $58
    .bind(&data.mail_head)           // $59
    .bind(&data.mail_body)           // $60
    .bind(&data.send_mail_guest_yn)  // $61
    .bind(&data.send_mail_company_yn) // $62
    .bind(&data.sale_ref_no_yn)      // $63
    .bind(&data.print_room_tariff_bill_yn) // $64
    .bind(&data.per_head_tariff_bill_yn)   // $65
    .bind(&data.multi_room_tariff_total_pax) // $66
    .bind(&data.tax_after_discount_yn) // $67
    .bind(&data.mobile_no1)          // $68
    .bind(&data.mobile_no2)          // $69
    .bind(&data.mobile_no3)          // $70
    .bind(&data.total_discount_gl_code) // $71
    .bind(data.extra_person)         // $72
    .bind(&data.check_out_time)      // $73
    .bind(&data.checkout_yn)         // $74
    .bind(&data.room_service)        // $75
    .bind(&data.check_in_time)       // $76
    .bind(&data.restaurant_sale)     // $77
    .bind(&data.tally_voucher_type)  // $78
    .bind(data.luxury_tax_master_code) // $79
    .bind(&data.bill_settlement_yn)  // $80
    .bind(data.service_tax_master_code) // $81
    .bind(&data.print_sale_crystal_report_yn) // $82
    .bind(&data.call_record_filepath) // $83
    .bind(&data.auto_ref_no_yn)      // $84
    .bind(&data.phone_call_group_id) // $85
    .bind(&data.detail_bill_report_yn) // $86
    .bind(&data.phone_call_item_id)  // $87
    .bind(&data.separate_bill_no_yn) // $88
    .bind(&data.total_discount_tally_code) // $89
    .bind(&data.capillary_file_yn)   // $90
    .bind(&data.room_service_direct_per) // $91
    .bind(&data.locking_system_yn)   // $92
    .bind(&data.locking_authorization) // $93
    .bind(&data.default_ledger_id)   // $94
    .bind(&data.default_guest_id)    // $95
    .bind(&data.time_for_wifi)       // $96
    .bind(&data.ip_address_for_wifi) // $97
    .bind(&data.port_no_for_wifi)    // $98
    .bind(&data.user_name_for_wifi)  // $99
    .bind(&data.password_for_wifi)   // $100
    .bind(&data.extra_bed_group_id)  // $101
    .bind(&data.print_gst_serial_no_yn) // $102
    .bind(&data.backup_path_name)    // $103
    .bind(&data.separate_rest_direct_yn) // $104
    .bind(&data.service_place)       // $105
    .bind(&data.print_company_logo_yn) // $106
    .bind(&data.company_name2)       // $107
    .bind(&data.name2)               // $108
    .bind(&data.start_date)          // $109
    .bind(&data.end_date)            // $110
    .bind(&data.fssai_no)            // $111
    .bind(&data.print_name_address)  // $112
    .bind(&data.receiver_email3)     // $113
    .bind(&data.cash_drawer_yn)      // $114
    .bind(&data.otp_rate_change_yn)  // $115
    .bind(&data.direct_bill_yn)      // $116
    .bind(&data.time_format)         // $117
    .bind(&data.cancellation_message_yn) // $118
    .bind(&data.print_token_yn)      // $119
    .bind(&data.print_bill_footer_yn) // $120
    .bind(&data.printer_setting)     // $121
    .bind(data.parcel_sec_code)      // $122
    .bind(data.non_chargeable)       // $123
    .bind(&data.partner_company_name) // $124
    .bind(&data.partner_address1)    // $125
    .bind(&data.partner_address2)    // $126
    .bind(&data.partner_address3)    // $127
    .bind(&data.partner_phone1)      // $128
    .bind(&data.partner_phone2)      // $129
    .bind(&data.partner_email)       // $130
    .bind(&data.end_of_report)       // $131
    .bind(&data.waiter_yn)           // $132
    .bind(&data.covers_yn)           // $133
    .bind(data.outlet_printer_food)  // $134
    .bind(data.outlet_printer_liquor) // $135
    .bind(data.max_qty)              // $136
    .bind(&data.modify_current_bill_yn) // $137
    .bind(&data.modify_settled_bill_yn) // $138
    .bind(&data.complementary_yn)    // $139
    .bind(&data.bill_closed_yn)      // $140
    .bind(&data.print_table_no_yn)   // $141
    .bind(&data.include_tax_yn)      // $142
    .bind(&data.allow_lodge_posting) // $143
    .bind(&data.domain_name)         // $144
    .bind(&data.pay_upi_id)          // $145
    .bind(&data.print_receipt_no_yn) // $146
    .bind(&data.sale_ratewise_yn)    // $147
    .bind(&data.sale_jv_ledger)      // $148
    .bind(&data.jv_ledger)           // $149
    .bind(&data.roundoff_ledger)     // $150
    .bind(&data.barcode_yn)          // $151
    .bind(data.search_type)          // $152
    .bind(&data.online_order_yn)     // $153
    .bind(&data.online_merchant_id)  // $154
    .bind(&data.online_direct_bill)  // $155
    .bind(&data.time_on_kot_yn)      // $156
    .bind(&data.multiple_order_yn)   // $157
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

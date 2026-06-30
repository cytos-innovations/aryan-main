import {
  DashboardSquare01Icon,
  FolderLibraryIcon,
  GridTableIcon,
  Layers01Icon,
  Message01Icon,
  MessageEdit01Icon,
  MessageMultiple01Icon,
  PackageIcon,
  Settings01Icon,
  Table01Icon,
  Table02Icon,
  TableIcon,
  Tag01Icon,
  UserGroupIcon,
  UserShield01Icon,
  PercentIcon,
  IdentityCardIcon,
  PieChart01Icon,
  ListViewIcon,
  UserAccountIcon,
  TaxesIcon,
  CreditCardIcon,
  Invoice03Icon,
  BookOpen01Icon,
  ReceiptIndianRupeeIcon,
  Building04Icon,
  // ── Reports icons ──
  Analytics01Icon,
  AnalyticsUpIcon,
  Calendar01Icon,
  Calendar03Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CashierIcon,
  ChartColumnIcon,
  ChartHistogramIcon,
  ChartLineData01Icon,
  ChefHatIcon,
  Clock01Icon,
  CodeIcon,
  Coins01Icon,
  Coins02Icon,
  ContactBookIcon,
  DashboardCircleIcon,
  DrinkIcon,
  Edit02Icon,
  FileEditIcon,
  GiftCardIcon,
  GiftIcon,
  HotdogIcon,
  KitchenUtensilsIcon,
  Menu01Icon,
  Money03Icon,
  MoneyBag01Icon,
  PresentationBarChart01Icon,
  PrinterIcon,
  QrCodeIcon,
  Recycle01Icon,
  Rocket01Icon,
  SaleTag01Icon,
  SaleTag02Icon,
  ServingFoodIcon,
  SourceCodeIcon,
  Store01Icon,
  UserListIcon,
  UserMultipleIcon,
  UserStar01Icon,
  WaiterIcon,
} from "@hugeicons/core-free-icons";

import Dashboard from "@/pages/dashboard";
import UserMain from "@/pages/utility/user-main";
import UserAccess from "@/pages/utility/user_access";
import CompanyDetails from "@/pages/utility/company_details";
import AccTaxMaster from "@/pages/master/acc_tax_master";
import AccTallyMaster from "@/pages/master/acc_tally_master";
import AccCreditor from "@/pages/master/party ledger/acc_creditor";
import AccDebtor from "@/pages/master/party ledger/acc_Debtor";
import AccDesignation from "@/pages/master/employee/acc_designation";
import AccEmployeeInfo from "@/pages/master/employee/acc_employee_info";
import LodgeCustomerInfo from "@/pages/master/lodge_customer_info";
import LodgeDiscountInfo from "@/pages/master/lodge_discount_info";
import LodgeIdentity from "@/pages/master/lodge_identity";
import LodgeMarketSegment from "@/pages/master/lodge_market_segment";
import LodgePlan from "@/pages/master/lodge_plan";
import MenuCategory from "@/pages/master/menu/rest_menu_category";
import MenuGroup from "@/pages/master/menu/rest_menu_group";
import FoodType from "@/pages/master/menu/rest_menu_type";
import MenuCard from "@/pages/master/menu/rest_menu_main";
import TableGroup from "@/pages/master/table/rest_table_group";
import RestaurantTable from "@/pages/master/table/rest_table_main";
import BillMessage from "@/pages/master/messages/rest_bill_msg";
import KotMessage from "@/pages/master/messages/rest_kot_msg";
import AccAccountCategories from "@/pages/master/account_groups/acc_account_categories";
import AccAccountGroups from "@/pages/master/account_groups/acc_account_groups";
import AccGeneralLedger from "@/pages/master/acc_general_Ledger";
import AccDayBook from "@/pages/master/acc_day_book";
import AccPartyBank from "@/pages/master/acc_party_bank";
import KitchenSection from "@/pages/master/menu/rest_kitchen_section";
import MaterialItemGroup from "@/pages/master/kitchen_stock/material_item_group";
import MaterialItemName from "@/pages/master/kitchen_stock/material_item_name";
import CalIncentive from "@/pages/transaction/rest_cal_insentive";
import BillingPage from "@/pages/bill";
// ── Reports ──
import RptDailySalesReport from "@/pages/reports/sales_reports/rest_daily_sales_report";
import RptDepartmentWiseSales from "@/pages/reports/sales_reports/rest_department_wise_sales";
import RptHourlyReport from "@/pages/reports/sales_reports/rest_hourly_report";
import RptDaywise from "@/pages/reports/sales_reports/rest_daywise";
import RptMonthwiseBill from "@/pages/reports/sales_reports/rest_monthwise_bill";
import RptRateWiseSale from "@/pages/reports/sales_reports/rest_rate_wise_sale";
import RptCategorywiseSale from "@/pages/reports/sales_reports/rest_categorywise_sale";
import RptFoodTypeWiseReport from "@/pages/reports/sales_reports/rest_food_type_wise_report";
import RptItemwiseSale from "@/pages/reports/sales_reports/rest_itemwise_sale";
import RptItemwiseSummary from "@/pages/reports/sales_reports/rest_itemwise_summary";
import RptItemSalesVelocityReport from "@/pages/reports/sales_reports/rest_item_sales_velocity_report";
import RptTaxSummary from "@/pages/reports/sales_reports/summary/rest_tax_summary";
import RptSalesSummary from "@/pages/reports/sales_reports/summary/rest_sales_summary";
import RptBillSettlements from "@/pages/reports/billing_reports/rest_bill_settlements";
import RptBillwiseCancel from "@/pages/reports/billing_reports/rest_billwise_cancel";
import RptCancellation from "@/pages/reports/billing_reports/rest_cancellation";
import RptModifiedBillReport from "@/pages/reports/billing_reports/rest_modified_bill_report";
import RptModifyLogReport from "@/pages/reports/billing_reports/rest_modify_log_report";
import RptReprintBill from "@/pages/reports/billing_reports/rest_reprint_bill";
import RptWashData from "@/pages/reports/billing_reports/rest_wash_data";
import RptUserwiseSettlement from "@/pages/reports/billing_reports/rest_userwise_settlement";
import RptKotDetailReport from "@/pages/reports/billing_reports/rest_kot_detail_report";
import RptCashierReport from "@/pages/reports/billing_reports/rest_cashier_report";
import RptTableSectionWise from "@/pages/reports/business_reports/table_wise_business/rest_table_section_wise";
import RptWaiterwiseSale from "@/pages/reports/business_reports/rest_waiterwise_sale";
import RptWaiterwiseReport from "@/pages/reports/business_reports/rest_waiterwise_report";
import RptWaiterwiseIncentive from "@/pages/reports/business_reports/rest_waiterwise_incentive";
import RptWaiterAmountwise from "@/pages/reports/business_reports/rest_waiter_amountwise";
import RptCaptainwiseItemDetails from "@/pages/reports/business_reports/rest_captainwise_item_details";
import RptEmployeeWiseReport from "@/pages/reports/business_reports/rest_employee_wise_report";
import RptEmployeeSale from "@/pages/reports/business_reports/rest_employee_sale";
import RptEmployeeIncentive from "@/pages/reports/business_reports/rest_employee_incentive";
import RptUserWiseReport from "@/pages/reports/business_reports/rest_user_wise_report";
import RptCashHandOver from "@/pages/reports/business_reports/rest_cash_hand_over";
import RptPartyList from "@/pages/reports/menu_master_reports/rest_party_list";
import RptCustomerList from "@/pages/reports/menu_master_reports/rest_customer_list";
import RptMenuCodeList from "@/pages/reports/menu_master_reports/rest_menu_code_list";
import RptMenuDeluxeRate from "@/pages/reports/menu_master_reports/rest_menu_deluxe_rate";
import RptCodewiseMenu from "@/pages/reports/menu_master_reports/rest_codewise_menu";
import RptItemCodingList from "@/pages/reports/menu_master_reports/rest_item_coding_list";
import RptGrpCodingList from "@/pages/reports/menu_master_reports/rest_grp_coding_list";
import RptGrpItemPrice from "@/pages/reports/menu_master_reports/rest_grp_item_price";
import RptMenuGroup from "@/pages/reports/menu_master_reports/rest_menu_group";
import RptLiquorGroup from "@/pages/reports/menu_master_reports/rest_liquor_group";
import RptKitchenSectionWiseItem from "@/pages/reports/menu_master_reports/rest_kitchen_section_wise_item";
import RptKotMessageCode from "@/pages/reports/menu_master_reports/rest_kot_message_code";
import RptIncentiveList from "@/pages/reports/menu_master_reports/rest_incentive_list";
import RptDashboardSummary from "@/pages/reports/mis_reports/rest_dashboard_summary";
import RptCustomMisReports from "@/pages/reports/mis_reports/rest_custom_mis_reports";

// ── Registry ─────────────────────────────────────────────────
// Each leaf: { path, label, application, section, perm, icon, element }
//   application: the application code this item belongs to (null = visible in all apps)
//   section:     which user-access tab owns this permission (master/transaction/reports/utility)
// Folders: { label, icon, application?, items[] }
// ─────────────────────────────────────────────────────────────

export const registry = [
  {
    label: "Operations",
    items: [
      {
        path: "/dashboard",
        label: "Dashboard",
        application: "restaurant,lodge,account,material",
        section: "utility",
        perm: "dashboard:view",
        icon: DashboardSquare01Icon,
        element: <Dashboard />,
      },
      {
        path: "/billing",
        label: "Billing",
        application: "restaurant",
        section: "transaction",
        perm: "billing:view",
        icon: ReceiptIndianRupeeIcon,
        element: <BillingPage />,
      },
    ],
  },
  {
    label: "Master Data",
    items: [
      {
        path: "/master/lodge/customers",
        label: "Customer Information",
        application: "lodge,restaurant",
        section: "master",
        perm: "lodge-customer:view",
        icon: UserAccountIcon,
        element: <LodgeCustomerInfo />,
      },
      {
        path: "/master/lodge/discount",
        label: "Discount Information",
        application: "lodge",
        section: "master",
        perm: "lodge-discount:view",
        icon: PercentIcon,
        element: <LodgeDiscountInfo />,
      },
      {
        path: "/master/lodge/identity",
        label: "Identity Master",
        application: "lodge",
        section: "master",
        perm: "lodge-identity:view",
        icon: IdentityCardIcon,
        element: <LodgeIdentity />,
      },
      {
        path: "/master/lodge/market-segment",
        label: "Market Segments",
        application: "lodge",
        section: "master",
        perm: "lodge-market-segment:view",
        icon: PieChart01Icon,
        element: <LodgeMarketSegment />,
      },
      {
        path: "/master/lodge/plan",
        label: "Plan Master",
        application: "lodge",
        section: "master",
        perm: "lodge-plan:view",
        icon: ListViewIcon,
        element: <LodgePlan />,
      },
      {
        label: "Menu Management",
        icon: FolderLibraryIcon,
        application: "restaurant",
        items: [
          {
            path: "/master/menu/categories",
            label: "Menu Categories",
            application: "restaurant",
            section: "master",
            perm: "menu-category:view",
            icon: Tag01Icon,
            element: <MenuCategory />,
          },
          {
            path: "/master/food-types",
            label: "Food Types",
            application: "restaurant",
            section: "master",
            perm: "food-type:view",
            icon: GridTableIcon,
            element: <FoodType />,
          },
          {
            path: "/master/menu/groups",
            label: "Menu Groups",
            application: "restaurant",
            section: "master",
            perm: "menu-group:view",
            icon: Layers01Icon,
            element: <MenuGroup />,
          },
          {
            path: "/master/menu/card",
            label: "Menu Card",
            application: "restaurant",
            section: "master",
            perm: "menu-card:view",
            icon: PackageIcon,
            element: <MenuCard />,
          },
          {
            path: "/master/menu/kitchen-sections",
            label: "Kitchen Sections",
            application: "restaurant",
            section: "master",
            perm: "kitchen-section:view",
            icon: GridTableIcon,
            element: <KitchenSection />,
          },
        ],
      },
      {
        label: "Table Management",
        icon: TableIcon,
        application: "restaurant",
        items: [
          {
            path: "/master/table/groups",
            label: "Table Groups",
            application: "restaurant",
            section: "master",
            perm: "table-group:view",
            icon: Table01Icon,
            element: <TableGroup />,
          },
          {
            path: "/master/table/tables",
            label: "Restaurant Tables",
            application: "restaurant",
            section: "master",
            perm: "restaurant-table:view",
            icon: Table02Icon,
            element: <RestaurantTable />,
          },
        ],
      },
      {
        label: "Messages",
        icon: Message01Icon,
        application: "restaurant",
        items: [
          {
            path: "/master/messages/bill",
            label: "Bill Messages",
            application: "restaurant",
            section: "master",
            perm: "bill-message:view",
            icon: MessageEdit01Icon,
            element: <BillMessage />,
          },
          {
            path: "/master/messages/kot",
            label: "KOT Messages",
            application: "restaurant",
            section: "master",
            perm: "kot-message:view",
            icon: MessageMultiple01Icon,
            element: <KotMessage />,
          },
        ],
      },
      {
        path: "/master/account/tax",
        label: "Tax Master",
        application: "account",
        section: "master",
        perm: "acc-tax-master:view",
        icon: TaxesIcon,
        element: <AccTaxMaster />,
      },
      {
        path: "/master/account/tally",
        label: "Tally Master",
        application: "account",
        section: "master",
        perm: "acc-tally-master:view",
        icon: ListViewIcon,
        element: <AccTallyMaster />,
      },
      {
        path: "/master/account/general-ledger",
        label: "General Ledger",
        application: "account",
        section: "master",
        perm: "acc-general-ledger:view",
        icon: BookOpen01Icon,
        element: <AccGeneralLedger />,
      },
      {
        path: "/master/account/day-book",
        label: "Day Book",
        application: "account",
        section: "master",
        perm: "acc-day-book:view",
        icon: ListViewIcon,
        element: <AccDayBook />,
      },
      {
        path: "/master/account/party-bank",
        label: "Party Bank",
        application: "account",
        section: "master",
        perm: "acc-party-bank:view",
        icon: CreditCardIcon,
        element: <AccPartyBank />,
      },
      {
        label: "Account Groups",
        icon: GridTableIcon,
        application: "account",
        items: [
          {
            path: "/master/account/categories",
            label: "Account Categories",
            application: "account",
            section: "master",
            perm: "acc-account-category:view",
            icon: GridTableIcon,
            element: <AccAccountCategories />,
          },
          {
            path: "/master/account/groups",
            label: "Account Groups",
            application: "account",
            section: "master",
            perm: "acc-account-group:view",
            icon: GridTableIcon,
            element: <AccAccountGroups />,
          },
        ],
      },
      {
        label: "Party Ledger",
        icon: BookOpen01Icon,
        application: "account",
        items: [
          {
            path: "/master/account/creditor",
            label: "Creditor Ledger",
            application: "account",
            section: "master",
            perm: "acc-creditor:view",
            icon: CreditCardIcon,
            element: <AccCreditor />,
          },
          {
            path: "/master/account/debtor",
            label: "Debtor Ledger",
            application: "account",
            section: "master",
            perm: "acc-debtor:view",
            icon: Invoice03Icon,
            element: <AccDebtor />,
          },
        ],
      },
      {
        label: "Kitchen Stock",
        icon: PackageIcon,
        application: "material",
        items: [
          {
            path: "/master/material/item-group",
            label: "Item Group Master",
            application: "material",
            section: "master",
            perm: "mat-item-group:view",
            icon: GridTableIcon,
            element: <MaterialItemGroup />,
          },
          {
            path: "/master/material/item-name",
            label: "Item Name Master",
            application: "material",
            section: "master",
            perm: "mat-item-name:view",
            icon: Layers01Icon,
            element: <MaterialItemName />,
          },
        ],
      },
      {
        label: "Employee",
        icon: UserGroupIcon,
        application: "restaurant,lodge,account,material",
        items: [
          {
            path: "/master/employee/designation",
            label: "Designation",
            application: "account",
            section: "master",
            perm: "employee-designation:view",
            icon: IdentityCardIcon,
            element: <AccDesignation />,
          },
          {
            path: "/master/employee/info",
            label: "Employee Information",
            application: "account",
            section: "master",
            perm: "employee-info:view",
            icon: UserAccountIcon,
            element: <AccEmployeeInfo />,
          },
        ],
      },
    ],
  },
  {
    label: "Transactions",
    items: [
      {
        path: "/transaction/restaurant/cal-incentive",
        label: "Cal Incentive",
        application: "restaurant",
        section: "transaction",
        perm: "cal-incentive:view",
        icon: PercentIcon,
        element: <CalIncentive />,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Sales Reports",
        icon: Analytics01Icon,
        application: "restaurant",
        items: [
          {
            path: "/reports/sales/daily-sales-report",
            label: "Daily Sales Report",
            application: "restaurant",
            section: "reports",
            perm: "report-daily-sales-report:view",
            icon: ChartLineData01Icon,
            element: <RptDailySalesReport />,
          },
          {
            path: "/reports/sales/department-wise-sales",
            label: "Department wise Sales",
            application: "restaurant",
            section: "reports",
            perm: "report-department-wise-sales:view",
            icon: ChartColumnIcon,
            element: <RptDepartmentWiseSales />,
          },
          {
            path: "/reports/sales/hourly-report",
            label: "Hourly Report",
            application: "restaurant",
            section: "reports",
            perm: "report-hourly-report:view",
            icon: Clock01Icon,
            element: <RptHourlyReport />,
          },
          {
            path: "/reports/sales/daywise",
            label: "Daywise",
            application: "restaurant",
            section: "reports",
            perm: "report-daywise:view",
            icon: Calendar01Icon,
            element: <RptDaywise />,
          },
          {
            path: "/reports/sales/monthwise-bill",
            label: "Monthwise Bill",
            application: "restaurant",
            section: "reports",
            perm: "report-monthwise-bill:view",
            icon: Calendar03Icon,
            element: <RptMonthwiseBill />,
          },
          {
            path: "/reports/sales/rate-wise-sale",
            label: "Rate Wise Sale",
            application: "restaurant",
            section: "reports",
            perm: "report-rate-wise-sale:view",
            icon: Coins01Icon,
            element: <RptRateWiseSale />,
          },
          {
            path: "/reports/sales/categorywise-sale",
            label: "Categorywise Sale",
            application: "restaurant",
            section: "reports",
            perm: "report-categorywise-sale:view",
            icon: Tag01Icon,
            element: <RptCategorywiseSale />,
          },
          {
            path: "/reports/sales/food-type-wise-report",
            label: "Food Type wise Report",
            application: "restaurant",
            section: "reports",
            perm: "report-food-type-wise-report:view",
            icon: HotdogIcon,
            element: <RptFoodTypeWiseReport />,
          },
          {
            path: "/reports/sales/itemwise-sale",
            label: "Itemwise Sale",
            application: "restaurant",
            section: "reports",
            perm: "report-itemwise-sale:view",
            icon: SaleTag02Icon,
            element: <RptItemwiseSale />,
          },
          {
            path: "/reports/sales/itemwise-summary",
            label: "Itemwise Summary",
            application: "restaurant",
            section: "reports",
            perm: "report-itemwise-summary:view",
            icon: ChartHistogramIcon,
            element: <RptItemwiseSummary />,
          },
          {
            path: "/reports/sales/item-sales-velocity-report",
            label: "Item Sales Velocity Report",
            application: "restaurant",
            section: "reports",
            perm: "report-item-sales-velocity-report:view",
            icon: Rocket01Icon,
            element: <RptItemSalesVelocityReport />,
          },
          {
            label: "Summary",
            icon: PieChart01Icon,
            application: "restaurant",
            items: [
              {
                path: "/reports/sales/summary/tax-summary",
                label: "Tax Summary",
                application: "restaurant",
                section: "reports",
                perm: "report-tax-summary:view",
                icon: TaxesIcon,
                element: <RptTaxSummary />,
              },
              {
                path: "/reports/sales/summary/sales-summary",
                label: "Sales Summary",
                application: "restaurant",
                section: "reports",
                perm: "report-sales-summary:view",
                icon: PresentationBarChart01Icon,
                element: <RptSalesSummary />,
              },
            ],
          },
        ],
      },
      {
        label: "Billing Reports",
        icon: Invoice03Icon,
        application: "restaurant",
        items: [
          {
            path: "/reports/billing/bill-settlements",
            label: "Bill Settlements",
            application: "restaurant",
            section: "reports",
            perm: "report-bill-settlements:view",
            icon: ReceiptIndianRupeeIcon,
            element: <RptBillSettlements />,
          },
          {
            path: "/reports/billing/billwise-cancel",
            label: "Billwise Cancel",
            application: "restaurant",
            section: "reports",
            perm: "report-billwise-cancel:view",
            icon: Cancel01Icon,
            element: <RptBillwiseCancel />,
          },
          {
            path: "/reports/billing/cancellation",
            label: "Cancellation",
            application: "restaurant",
            section: "reports",
            perm: "report-cancellation:view",
            icon: CancelCircleIcon,
            element: <RptCancellation />,
          },
          {
            path: "/reports/billing/modified-bill-report",
            label: "Modified Bill Report",
            application: "restaurant",
            section: "reports",
            perm: "report-modified-bill-report:view",
            icon: FileEditIcon,
            element: <RptModifiedBillReport />,
          },
          {
            path: "/reports/billing/modify-log-report",
            label: "Modify Log Report",
            application: "restaurant",
            section: "reports",
            perm: "report-modify-log-report:view",
            icon: Edit02Icon,
            element: <RptModifyLogReport />,
          },
          {
            path: "/reports/billing/reprint-bill",
            label: "RePrint Bill",
            application: "restaurant",
            section: "reports",
            perm: "report-reprint-bill:view",
            icon: PrinterIcon,
            element: <RptReprintBill />,
          },
          {
            path: "/reports/billing/wash-data",
            label: "Wash Data",
            application: "restaurant",
            section: "reports",
            perm: "report-wash-data:view",
            icon: Recycle01Icon,
            element: <RptWashData />,
          },
          {
            path: "/reports/billing/userwise-settlement",
            label: "Userwise Settlement",
            application: "restaurant",
            section: "reports",
            perm: "report-userwise-settlement:view",
            icon: UserMultipleIcon,
            element: <RptUserwiseSettlement />,
          },
          {
            path: "/reports/billing/kot-detail-report",
            label: "KOT Detail Report",
            application: "restaurant",
            section: "reports",
            perm: "report-kot-detail-report:view",
            icon: ChefHatIcon,
            element: <RptKotDetailReport />,
          },
          {
            path: "/reports/billing/cashier-report",
            label: "Cashier Report",
            application: "restaurant",
            section: "reports",
            perm: "report-cashier-report:view",
            icon: CashierIcon,
            element: <RptCashierReport />,
          },
        ],
      },
      {
        label: "Business Reports",
        icon: Store01Icon,
        application: "restaurant",
        items: [
          {
            label: "Table wise Business",
            icon: TableIcon,
            application: "restaurant",
            items: [
              {
                path: "/reports/business/table-wise-business/table-section-wise",
                label: "Table Section wise",
                application: "restaurant",
                section: "reports",
                perm: "report-table-section-wise:view",
                icon: Table01Icon,
                element: <RptTableSectionWise />,
              },
            ],
          },
          {
            path: "/reports/business/waiterwise-sale",
            label: "Waiterwise Sale",
            application: "restaurant",
            section: "reports",
            perm: "report-waiterwise-sale:view",
            icon: WaiterIcon,
            element: <RptWaiterwiseSale />,
          },
          {
            path: "/reports/business/waiterwise-report",
            label: "Waiterwise Report",
            application: "restaurant",
            section: "reports",
            perm: "report-waiterwise-report:view",
            icon: ServingFoodIcon,
            element: <RptWaiterwiseReport />,
          },
          {
            path: "/reports/business/waiterwise-incentive",
            label: "Waiterwise Incentive",
            application: "restaurant",
            section: "reports",
            perm: "report-waiterwise-incentive:view",
            icon: GiftIcon,
            element: <RptWaiterwiseIncentive />,
          },
          {
            path: "/reports/business/waiter-amountwise",
            label: "Waiter Amountwise",
            application: "restaurant",
            section: "reports",
            perm: "report-waiter-amountwise:view",
            icon: Coins02Icon,
            element: <RptWaiterAmountwise />,
          },
          {
            path: "/reports/business/captainwise-item-details",
            label: "Captainwise Item Details",
            application: "restaurant",
            section: "reports",
            perm: "report-captainwise-item-details:view",
            icon: UserStar01Icon,
            element: <RptCaptainwiseItemDetails />,
          },
          {
            path: "/reports/business/employee-wise-report",
            label: "Employee wise Report",
            application: "restaurant",
            section: "reports",
            perm: "report-employee-wise-report:view",
            icon: UserGroupIcon,
            element: <RptEmployeeWiseReport />,
          },
          {
            path: "/reports/business/employee-sale",
            label: "Employee Sale",
            application: "restaurant",
            section: "reports",
            perm: "report-employee-sale:view",
            icon: Money03Icon,
            element: <RptEmployeeSale />,
          },
          {
            path: "/reports/business/employee-incentive",
            label: "Employee Incentive",
            application: "restaurant",
            section: "reports",
            perm: "report-employee-incentive:view",
            icon: GiftCardIcon,
            element: <RptEmployeeIncentive />,
          },
          {
            path: "/reports/business/user-wise-report",
            label: "User Wise Report",
            application: "restaurant",
            section: "reports",
            perm: "report-user-wise-report:view",
            icon: UserAccountIcon,
            element: <RptUserWiseReport />,
          },
          {
            path: "/reports/business/cash-hand-over",
            label: "Cash Hand-Over",
            application: "restaurant",
            section: "reports",
            perm: "report-cash-hand-over:view",
            icon: MoneyBag01Icon,
            element: <RptCashHandOver />,
          },
        ],
      },
      {
        label: "Menu & Master Reports",
        icon: Menu01Icon,
        application: "restaurant",
        items: [
          {
            path: "/reports/menu-master/party-list",
            label: "Party List",
            application: "restaurant",
            section: "reports",
            perm: "report-party-list:view",
            icon: ContactBookIcon,
            element: <RptPartyList />,
          },
          {
            path: "/reports/menu-master/customer-list",
            label: "Customer List",
            application: "restaurant",
            section: "reports",
            perm: "report-customer-list:view",
            icon: UserListIcon,
            element: <RptCustomerList />,
          },
          {
            path: "/reports/menu-master/menu-code-list",
            label: "Menu Code List",
            application: "restaurant",
            section: "reports",
            perm: "report-menu-code-list:view",
            icon: QrCodeIcon,
            element: <RptMenuCodeList />,
          },
          {
            path: "/reports/menu-master/menu-deluxe-rate",
            label: "Menu Deluxe Rate",
            application: "restaurant",
            section: "reports",
            perm: "report-menu-deluxe-rate:view",
            icon: SaleTag01Icon,
            element: <RptMenuDeluxeRate />,
          },
          {
            path: "/reports/menu-master/codewise-menu",
            label: "Codewise Menu",
            application: "restaurant",
            section: "reports",
            perm: "report-codewise-menu:view",
            icon: SourceCodeIcon,
            element: <RptCodewiseMenu />,
          },
          {
            path: "/reports/menu-master/item-coding-list",
            label: "Item Coding List",
            application: "restaurant",
            section: "reports",
            perm: "report-item-coding-list:view",
            icon: CodeIcon,
            element: <RptItemCodingList />,
          },
          {
            path: "/reports/menu-master/grp-coding-list",
            label: "Grp. Coding List",
            application: "restaurant",
            section: "reports",
            perm: "report-grp-coding-list:view",
            icon: Layers01Icon,
            element: <RptGrpCodingList />,
          },
          {
            path: "/reports/menu-master/grp-item-price",
            label: "Grp. Item Price",
            application: "restaurant",
            section: "reports",
            perm: "report-grp-item-price:view",
            icon: Coins01Icon,
            element: <RptGrpItemPrice />,
          },
          {
            path: "/reports/menu-master/menu-group",
            label: "Menu Group",
            application: "restaurant",
            section: "reports",
            perm: "report-menu-group:view",
            icon: PackageIcon,
            element: <RptMenuGroup />,
          },
          {
            path: "/reports/menu-master/liquor-group",
            label: "Liquor Group",
            application: "restaurant",
            section: "reports",
            perm: "report-liquor-group:view",
            icon: DrinkIcon,
            element: <RptLiquorGroup />,
          },
          {
            path: "/reports/menu-master/kitchen-section-wise-item",
            label: "Kitchen Section wise Item",
            application: "restaurant",
            section: "reports",
            perm: "report-kitchen-section-wise-item:view",
            icon: KitchenUtensilsIcon,
            element: <RptKitchenSectionWiseItem />,
          },
          {
            path: "/reports/menu-master/kot-message-code",
            label: "Kot Message Code",
            application: "restaurant",
            section: "reports",
            perm: "report-kot-message-code:view",
            icon: Message01Icon,
            element: <RptKotMessageCode />,
          },
          {
            path: "/reports/menu-master/incentive-list",
            label: "Incentive List",
            application: "restaurant",
            section: "reports",
            perm: "report-incentive-list:view",
            icon: GiftIcon,
            element: <RptIncentiveList />,
          },
        ],
      },
      {
        label: "MIS Reports",
        icon: DashboardSquare01Icon,
        application: "restaurant",
        items: [
          {
            path: "/reports/mis/dashboard-summary",
            label: "Dashboard Summary",
            application: "restaurant",
            section: "reports",
            perm: "report-dashboard-summary:view",
            icon: DashboardCircleIcon,
            element: <RptDashboardSummary />,
          },
          {
            path: "/reports/mis/custom-mis-reports",
            label: "Custom MIS Reports",
            application: "restaurant",
            section: "reports",
            perm: "report-custom-mis-reports:view",
            icon: AnalyticsUpIcon,
            element: <RptCustomMisReports />,
          },
        ],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Utility",
        icon: Settings01Icon,
        items: [
          {
            path: "/admin/users",
            label: "Users",
            application: "restaurant,lodge,account,material",
            section: "utility",
            perm: "users:view",
            icon: UserGroupIcon,
            element: <UserMain />,
          },
          {
            path: "/admin/user-access",
            label: "User Access",
            application: "restaurant,lodge,account,material",
            section: "utility",
            perm: "user-access:view",
            icon: UserShield01Icon,
            element: <UserAccess />,
          },
          {
            path: "/admin/company-details",
            label: "Company Details",
            application: "restaurant,lodge,account,material",
            section: "utility",
            perm: "company-details:view",
            icon: Building04Icon,
            element: <CompanyDetails />,
          },
        ],
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────

function flatten(items) {
  return items.flatMap((i) => (i.items ? flatten(i.items) : [i]));
}

export const flatRoutes = registry.flatMap((g) => flatten(g.items));

export const homePath = "/dashboard";

export function firstAccessiblePath(permissions) {
  if (!Array.isArray(permissions)) return null;
  const allowed = (perm) =>
    !perm || permissions.includes("*") || permissions.includes(perm);

  const home = flatRoutes.find((r) => r.path === homePath);
  if (home && allowed(home.perm)) return homePath;
  const route = flatRoutes.find((r) => allowed(r.perm));
  return route?.path ?? null;
}

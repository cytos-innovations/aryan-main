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
} from "@hugeicons/core-free-icons";

import Dashboard from "@/pages/dashboard";
import UserMain from "@/pages/utility/user-main";
import UserAccess from "@/pages/utility/user_access";
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

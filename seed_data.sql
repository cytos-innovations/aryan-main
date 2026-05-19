
INSERT INTO units (name) VALUES
    ('Pcs'),
    ('Kg'),
    ('Grams'),
    ('Litre'),
    ('ML'),
    ('Bottle')
ON CONFLICT (name) DO NOTHING;


INSERT INTO kitchen_section (name, is_print_enabled) VALUES
    ('section_1', TRUE),
    ('section_2', TRUE),
    ('section_3', TRUE),
    ('section_4', FALSE),
    ('section_5', FALSE)
ON CONFLICT (name) DO NOTHING;


INSERT INTO food_type (name) VALUES
    ('Veg'),
    ('Non-Veg'),
    ('Egg'),
    ('Vegan'),
    ('Beverage')
ON CONFLICT (name) DO NOTHING;


INSERT INTO identity_type (name) VALUES
    ('Aadhaar Card'),
    ('PAN Card'),
    ('Passport'),
    ('Voter ID'),
    ('Driving Licence'),
    ('Ration Card')
ON CONFLICT (name) DO NOTHING;


INSERT INTO market_segment (name) VALUES
    ('Walk-In'),
    ('Booking.com'),
    ('Make My Trip'),
    ('Travel Agent'),
    ('Government'),
    ('Group Booking')
ON CONFLICT (name) DO NOTHING;


INSERT INTO plan_master (name, tariff, plan_details) VALUES
    ('EP',  0, 'European Plan – Room only, no meals included'),
    ('CP',  0, 'Continental Plan – Room + Breakfast'),
    ('MAP', 0, 'Modified American Plan – Room + Breakfast + Dinner'),
    ('AP',  0, 'American Plan – Room + all three meals'),
    ('DAY', 0, 'Day Use – Checkout same day')
ON CONFLICT (name) DO NOTHING;


INSERT INTO account_categories (name, category_type) VALUES
    ('Assets',      'Asset'),
    ('Liabilities', 'Liability'),
    ('Equity',      'Equity'),
    ('Income',      'Income'),
    ('Expenses',    'Expense')
ON CONFLICT (name) DO NOTHING;


INSERT INTO account_groups (name, category_id) VALUES
    ('Fixed Assets',          (SELECT id FROM account_categories WHERE name = 'Assets')),
    ('Current Assets',        (SELECT id FROM account_categories WHERE name = 'Assets')),
    ('Cash & Bank',           (SELECT id FROM account_categories WHERE name = 'Assets')),
    ('Sundry Debtors',        (SELECT id FROM account_categories WHERE name = 'Assets')),
    ('Current Liabilities',   (SELECT id FROM account_categories WHERE name = 'Liabilities')),
    ('Long-term Liabilities', (SELECT id FROM account_categories WHERE name = 'Liabilities')),
    ('Sundry Creditors',      (SELECT id FROM account_categories WHERE name = 'Liabilities')),
    ('Capital',               (SELECT id FROM account_categories WHERE name = 'Equity')),
    ('Sales',                 (SELECT id FROM account_categories WHERE name = 'Income')),
    ('Other Income',          (SELECT id FROM account_categories WHERE name = 'Income')),
    ('Purchase',              (SELECT id FROM account_categories WHERE name = 'Expenses')),
    ('Direct Expenses',       (SELECT id FROM account_categories WHERE name = 'Expenses')),
    ('Indirect Expenses',     (SELECT id FROM account_categories WHERE name = 'Expenses'))
ON CONFLICT DO NOTHING;


INSERT INTO tally_master (name) VALUES
    ('Cash'),
    ('Bank'),
    ('Sales'),
    ('Purchase'),
    ('GST Output'),
    ('GST Input'),
    ('Service Tax'),
    ('Discount'),
    ('Commission')
ON CONFLICT DO NOTHING;

INSERT INTO general_ledger (name, open_bal, open_crdr, grp_code) VALUES
    ('Cash In Hand',          0, 'D', (SELECT id FROM account_groups WHERE name = 'Cash & Bank')),
    ('Bank Account',          0, 'D', (SELECT id FROM account_groups WHERE name = 'Cash & Bank')),
    ('Sales Account',         0, 'C', (SELECT id FROM account_groups WHERE name = 'Sales')),
    ('Purchase Account',      0, 'D', (SELECT id FROM account_groups WHERE name = 'Purchase')),
    ('GST Output',            0, 'C', (SELECT id FROM account_groups WHERE name = 'Current Liabilities')),
    ('GST Input',             0, 'D', (SELECT id FROM account_groups WHERE name = 'Current Assets')),
    ('Salary Expense',        0, 'D', (SELECT id FROM account_groups WHERE name = 'Direct Expenses')),
    ('Rent Expense',          0, 'D', (SELECT id FROM account_groups WHERE name = 'Indirect Expenses')),
    ('Electricity Expense',   0, 'D', (SELECT id FROM account_groups WHERE name = 'Indirect Expenses')),
    ('Capital Account',       0, 'C', (SELECT id FROM account_groups WHERE name = 'Capital')),
    ('Discount Allowed',      0, 'D', (SELECT id FROM account_groups WHERE name = 'Indirect Expenses')),
    ('Discount Received',     0, 'C', (SELECT id FROM account_groups WHERE name = 'Other Income')),
    ('Commission Received',   0, 'C', (SELECT id FROM account_groups WHERE name = 'Other Income')),
    ('Food & Beverage Sales', 0, 'C', (SELECT id FROM account_groups WHERE name = 'Sales')),
    ('Room Revenue',          0, 'C', (SELECT id FROM account_groups WHERE name = 'Sales'))
ON CONFLICT DO NOTHING;

INSERT INTO tax_master (name) VALUES
    ('Exempt'),
    ('GST 5%'),
    ('GST 12%'),
    ('GST 18%'),
    ('GST 28%'),
    ('Service Charge 10%')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tax_slab (tax_master_id, slab_from, slab_to, tax_percentage) VALUES
    ((SELECT id FROM tax_master WHERE name = 'Exempt'),           0, 999999, 0),
    ((SELECT id FROM tax_master WHERE name = 'GST 5%'),           0, 999999, 5),
    ((SELECT id FROM tax_master WHERE name = 'GST 12%'),          0, 999999, 12),
    ((SELECT id FROM tax_master WHERE name = 'GST 18%'),          0, 999999, 18),
    ((SELECT id FROM tax_master WHERE name = 'GST 28%'),          0, 999999, 28),
    ((SELECT id FROM tax_master WHERE name = 'Service Charge 10%'), 0, 999999, 10)
ON CONFLICT DO NOTHING;


INSERT INTO employee_designation (name, salary) VALUES
    ('Manager',        50000),
    ('Asst. Manager',  35000),
    ('Receptionist',   20000),
    ('Cashier',        18000),
    ('Waiter',         15000),
    ('Captain',        18000),
    ('Chef',           30000),
    ('Housekeeping',   14000),
    ('Security Guard', 13000),
    ('Driver',         15000)
ON CONFLICT (name) DO NOTHING;


INSERT INTO party_bank (name, location) VALUES
    ('State Bank of India', 'Main Branch'),
    ('HDFC Bank',           'City Branch'),
    ('ICICI Bank',          'City Branch'),
    ('Axis Bank',           'City Branch'),
    ('Bank of Baroda',      'Main Branch')
ON CONFLICT DO NOTHING;


INSERT INTO bill_message (message_text) VALUES
    ('Thank you for dining with us!'),
    ('Please visit again.'),
    ('Feedback is welcome.'),
    ('Home delivery available. Call us!')
ON CONFLICT DO NOTHING;


INSERT INTO kot_message (kot_message) VALUES
    ('Rush Order'),
    ('Less Spicy'),
    ('Extra Spicy'),
    ('No Onion'),
    ('No Garlic'),
    ('Well Done'),
    ('Half Portion')
ON CONFLICT DO NOTHING;


INSERT INTO state_master (name) VALUES
    ('Andhra Pradesh'),
    ('Arunachal Pradesh'),
    ('Assam'),
    ('Bihar'),
    ('Chhattisgarh'),
    ('Goa'),
    ('Gujarat'),
    ('Haryana'),
    ('Himachal Pradesh'),
    ('Jharkhand'),
    ('Karnataka'),
    ('Kerala'),
    ('Madhya Pradesh'),
    ('Maharashtra'),
    ('Manipur'),
    ('Meghalaya'),
    ('Mizoram'),
    ('Nagaland'),
    ('Odisha'),
    ('Punjab'),
    ('Rajasthan'),
    ('Sikkim'),
    ('Tamil Nadu'),
    ('Telangana'),
    ('Tripura'),
    ('Uttar Pradesh'),
    ('Uttarakhand'),
    ('West Bengal'),
    ('Andaman & Nicobar Islands'),
    ('Chandigarh'),
    ('Dadra & Nagar Haveli and Daman & Diu'),
    ('Delhi'),
    ('Jammu & Kashmir'),
    ('Ladakh'),
    ('Lakshadweep'),
    ('Puducherry')
ON CONFLICT DO NOTHING;


INSERT INTO city_master (name) VALUES
    ('Mumbai'),
    ('Delhi'),
    ('Bengaluru'),
    ('Hyderabad'),
    ('Ahmedabad'),
    ('Chennai'),
    ('Kolkata'),
    ('Surat'),
    ('Pune'),
    ('Jaipur'),
    ('Lucknow'),
    ('Kanpur'),
    ('Nagpur'),
    ('Indore'),
    ('Thane'),
    ('Bhopal'),
    ('Visakhapatnam'),
    ('Patna'),
    ('Vadodara'),
    ('Ghaziabad'),
    ('Ludhiana'),
    ('Agra'),
    ('Nashik'),
    ('Ranchi'),
    ('Faridabad'),
    ('Meerut'),
    ('Rajkot'),
    ('Varanasi'),
    ('Srinagar'),
    ('Aurangabad'),
    ('Dhanbad'),
    ('Amritsar'),
    ('Navi Mumbai'),
    ('Allahabad'),
    ('Coimbatore'),
    ('Jabalpur'),
    ('Gwalior'),
    ('Vijayawada'),
    ('Jodhpur'),
    ('Madurai'),
    ('Raipur'),
    ('Kota'),
    ('Chandigarh'),
    ('Guwahati'),
    ('Thiruvananthapuram'),
    ('Mysuru'),
    ('Mangaluru'),
    ('Panaji'),
    ('Shimla'),
    ('Dehradun')
ON CONFLICT DO NOTHING;

INSERT INTO menu_category (name, category_type, allow_discount, max_discount_percent, auto_discount_percent) VALUES
    ('Food',      'F', FALSE, 0, 0),
    ('Beverages', 'B', FALSE, 0, 0),
    ('Desserts',  'D', FALSE, 0, 0),
    ('Starters',  'S', FALSE, 0, 0),
    ('Liquor',    'L', FALSE, 0, 0),
    ('Snacks',    'F', FALSE, 0, 0)
ON CONFLICT (name) DO NOTHING;


INSERT INTO menu_group (name, is_payable, item_rate, category_id, applicable_service_tax, restaurant_sale_mode) VALUES
    ('Breakfast',        TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Food'),      FALSE, 'D'),
    ('Lunch',            TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Food'),      FALSE, 'D'),
    ('Dinner',           TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Food'),      FALSE, 'D'),
    ('Veg Starters',     TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Starters'),  FALSE, 'D'),
    ('Non-Veg Starters', TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Starters'),  FALSE, 'D'),
    ('Soft Drinks',      TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Beverages'), FALSE, 'D'),
    ('Hot Beverages',    TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Beverages'), FALSE, 'D'),
    ('Sweets',           TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Desserts'),  FALSE, 'D'),
    ('Ice Cream',        TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Desserts'),  FALSE, 'D'),
    ('Beer',             TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Liquor'),    FALSE, 'D'),
    ('Whiskey',          TRUE, 0, (SELECT id FROM menu_category WHERE name = 'Liquor'),    FALSE, 'D')
ON CONFLICT (name) DO NOTHING;


INSERT INTO table_group (name, allow_incentive, is_home_delivery, is_takeaway_enabled, is_tax_applicable, is_print_enabled, applicable_rate) VALUES
    ('Dining Hall',   'N', 'N', 'N', 'Y', 'Y', 1),
    ('Bar',           'N', 'N', 'N', 'Y', 'Y', 1),
    ('Rooftop',       'N', 'N', 'N', 'Y', 'Y', 1),
    ('Banquet',       'N', 'N', 'N', 'Y', 'Y', 1),
    ('Home Delivery', 'N', 'Y', 'N', 'Y', 'Y', 1),
    ('Takeaway',      'N', 'N', 'Y', 'Y', 'Y', 1)
ON CONFLICT (name) DO NOTHING;


INSERT INTO restaurant_table (table_name, is_home_delivery, is_tax_applicable, applicable_rate, table_group_id) VALUES
    ('Table 1',  'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Table 2',  'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Table 3',  'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Table 4',  'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Table 5',  'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Table 6',  'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Table 7',  'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Table 8',  'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Table 9',  'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Table 10', 'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Dining Hall')),
    ('Bar 1',    'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Bar')),
    ('Bar 2',    'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Bar')),
    ('Bar 3',    'N', 'Y', 1, (SELECT id FROM table_group WHERE name = 'Bar'))
ON CONFLICT DO NOTHING;


INSERT INTO discount_detail (name, discount_percent) VALUES
    ('No Discount',   0),
    ('Staff Discount', 20),
    ('Loyalty 5%',    5),
    ('Loyalty 10%',   10),
    ('Corporate 15%', 15),
    ('Complimentary', 100)
ON CONFLICT DO NOTHING;


INSERT INTO day_book (name, group_code, gen_leg_code) VALUES
    ('Cash Day Book',
        (SELECT id FROM account_groups WHERE name = 'Cash & Bank'),
        (SELECT id FROM general_ledger  WHERE name = 'Cash In Hand')),
    ('Bank Day Book',
        (SELECT id FROM account_groups WHERE name = 'Cash & Bank'),
        (SELECT id FROM general_ledger  WHERE name = 'Bank Account')),
    ('Sales Day Book',
        (SELECT id FROM account_groups WHERE name = 'Sales'),
        (SELECT id FROM general_ledger  WHERE name = 'Sales Account')),
    ('Purchase Day Book',
        (SELECT id FROM account_groups WHERE name = 'Purchase'),
        (SELECT id FROM general_ledger  WHERE name = 'Purchase Account'))
ON CONFLICT DO NOTHING;


INSERT INTO item_group (name, payable, item_rate, appli_service_tax, res_sale_mode) VALUES
    ('Raw Materials',    1, 0, 0, 0),
    ('Beverages Stock',  1, 0, 0, 0),
    ('Dry Goods',        1, 0, 0, 0),
    ('Cleaning Supplies',1, 0, 0, 0),
    ('Packaging',        1, 0, 0, 0)
ON CONFLICT (name) DO NOTHING;


INSERT INTO menu_category_tax_detail (category_id, tax_id, tax_percentage)
SELECT c.id, t.id, rows.pct
FROM (VALUES
    ('Food',      'GST 5%',  5),
    ('Beverages', 'GST 18%', 18),
    ('Desserts',  'GST 5%',  5),
    ('Starters',  'GST 5%',  5),
    ('Liquor',    'GST 28%', 28),
    ('Snacks',    'GST 5%',  5)
) AS rows(cat_name, tax_name, pct)
JOIN menu_category c ON c.name = rows.cat_name
JOIN tax_master    t ON t.name = rows.tax_name
WHERE NOT EXISTS (SELECT 1 FROM menu_category_tax_detail LIMIT 1);


INSERT INTO item_group_tax_detail (item_group_id, tax_id, tax_percentage)
SELECT ig.id, t.id, rows.pct
FROM (VALUES
    ('Raw Materials',     'GST 5%',  5),
    ('Beverages Stock',   'GST 18%', 18),
    ('Dry Goods',         'GST 5%',  5),
    ('Cleaning Supplies', 'GST 18%', 18),
    ('Packaging',         'GST 12%', 12)
) AS rows(grp_name, tax_name, pct)
JOIN item_group ig ON ig.name = rows.grp_name
JOIN tax_master t  ON t.name  = rows.tax_name
WHERE NOT EXISTS (SELECT 1 FROM item_group_tax_detail LIMIT 1);


INSERT INTO menu_card (name, menu_group_id, food_type_id, rate_1, rate_2, rate_3)
SELECT rows.name, mg.id, ft.id, rows.rate, rows.rate, rows.rate
FROM (VALUES
    ('Masala Dosa',          'Breakfast',        'Veg',      80),
    ('Idli Sambar (2 pcs)',  'Breakfast',        'Veg',      60),
    ('Poha',                 'Breakfast',        'Veg',      50),
    ('Upma',                 'Breakfast',        'Veg',      50),
    ('Veg Thali',            'Lunch',            'Veg',     150),
    ('Dal Rice',             'Lunch',            'Veg',     100),
    ('Chicken Biryani',      'Lunch',            'Non-Veg', 200),
    ('Egg Fried Rice',       'Lunch',            'Egg',     130),
    ('Paneer Butter Masala', 'Dinner',           'Veg',     220),
    ('Dal Makhani',          'Dinner',           'Veg',     180),
    ('Butter Chicken',       'Dinner',           'Non-Veg', 250),
    ('Mutton Curry',         'Dinner',           'Non-Veg', 300),
    ('Paneer Tikka',         'Veg Starters',     'Veg',     250),
    ('Veg Spring Roll',      'Veg Starters',     'Veg',     180),
    ('Hara Bhara Kebab',     'Veg Starters',     'Veg',     200),
    ('Chicken Tikka',        'Non-Veg Starters', 'Non-Veg', 280),
    ('Fish Fry',             'Non-Veg Starters', 'Non-Veg', 300),
    ('Chicken Wings',        'Non-Veg Starters', 'Non-Veg', 260),
    ('Coca Cola 300ml',      'Soft Drinks',      'Beverage',  40),
    ('Lime Soda',            'Soft Drinks',      'Beverage',  50),
    ('Mango Juice',          'Soft Drinks',      'Beverage',  60),
    ('Masala Chai',          'Hot Beverages',    'Beverage',  30),
    ('Cold Coffee',          'Hot Beverages',    'Beverage',  80),
    ('Filter Coffee',        'Hot Beverages',    'Beverage',  40),
    ('Gulab Jamun',          'Sweets',           'Veg',       60),
    ('Rasgulla',             'Sweets',           'Veg',       60),
    ('Vanilla Ice Cream',    'Ice Cream',        'Veg',       80),
    ('Chocolate Ice Cream',  'Ice Cream',        'Veg',       90)
) AS rows(name, grp_name, ft_name, rate)
JOIN menu_group mg ON mg.name = rows.grp_name
JOIN food_type  ft ON ft.name = rows.ft_name
WHERE NOT EXISTS (SELECT 1 FROM menu_card LIMIT 1);


INSERT INTO item_name (name, item_group_id, item_rate_1, item_rate_2, item_rate_3)
SELECT rows.name, ig.id, rows.rate, rows.rate, rows.rate
FROM (VALUES
    ('Basmati Rice (1 Kg)',       'Raw Materials',      80),
    ('Wheat Flour (1 Kg)',        'Raw Materials',      45),
    ('Sugar (1 Kg)',              'Raw Materials',      42),
    ('Refined Oil (1 Ltr)',       'Raw Materials',     180),
    ('Tomatoes (1 Kg)',           'Raw Materials',      40),
    ('Onions (1 Kg)',             'Raw Materials',      30),
    ('Turmeric Powder (100 g)',   'Dry Goods',          30),
    ('Red Chilli Powder (100 g)', 'Dry Goods',          50),
    ('Garam Masala (100 g)',      'Dry Goods',          80),
    ('Salt (1 Kg)',               'Dry Goods',          20),
    ('Cold Drink 300ml',          'Beverages Stock',    25),
    ('Mineral Water 1L',          'Beverages Stock',    20),
    ('Floor Cleaner (1 Ltr)',     'Cleaning Supplies', 120),
    ('Dish Wash Liquid (1 Ltr)',  'Cleaning Supplies',  80),
    ('Carry Bags (100 pcs)',      'Packaging',          50),
    ('Tissue Paper (100 pcs)',    'Packaging',          30)
) AS rows(name, grp_name, rate)
JOIN item_group ig ON ig.name = rows.grp_name
WHERE NOT EXISTS (SELECT 1 FROM item_name LIMIT 1);


INSERT INTO supplier_master (name, address1, mobile_no1, opening_bal, opening_crdr, closing_bal, closing_crdr, cust_type, gst_percent)
SELECT rows.name, rows.address1, rows.mobile_no1, 0, 'D', 0, 'D', 'C', rows.gst_pct
FROM (VALUES
    ('Local Vegetable Supplier', 'Market Area',        '9800000001', 5),
    ('ABC Grocery Wholesale',    'Industrial Area',    '9800000002', 5),
    ('XYZ Beverage Distributor', 'Commercial Complex', '9800000003', 18),
    ('City Meat Supplier',       'Non-Veg Market',     '9800000004', 5),
    ('National Grocery Co.',     'Wholesale Market',   '9800000005', 5)
) AS rows(name, address1, mobile_no1, gst_pct)
WHERE NOT EXISTS (SELECT 1 FROM supplier_master LIMIT 1);


INSERT INTO customer_information (prefix, customer_name, mobile_no1, address_line1, state_id, ledger_id, nationality, is_active)
SELECT rows.prefix, rows.cname, rows.mobile, rows.addr,
       (SELECT id FROM state_master  WHERE name = rows.state_name),
       (SELECT id FROM market_segment WHERE name = rows.seg_name),
       'Indian', 1
FROM (VALUES
    ('Mr.',  'Rahul Sharma',  '9876543210', 'A-101 Green Park',     'Delhi',         'Walk-In'),
    ('Mrs.', 'Priya Patel',   '9876543211', '12 MG Road',           'Maharashtra',   'Booking.com'),
    ('Mr.',  'Amit Kumar',    '9876543212', '45 Anna Nagar',         'Tamil Nadu',    'Make My Trip'),
    ('Ms.',  'Sunita Reddy',  '9876543213', '7 Banjara Hills',       'Telangana',     'Travel Agent'),
    ('Mr.',  'Vijay Mehta',   '9876543214', '88 Connaught Place',    'Delhi',         'Walk-In'),
    ('Mr.',  'Ravi Krishnan', '9876543215', '3 Koregaon Park',       'Maharashtra',   'Group Booking'),
    ('Mrs.', 'Anjali Singh',  '9876543216', '22 Residency Road',     'Karnataka',     'Walk-In'),
    ('Mr.',  'Deepak Joshi',  '9876543217', '56 Civil Lines',        'Uttar Pradesh', 'Travel Agent')
) AS rows(prefix, cname, mobile, addr, state_name, seg_name)
WHERE NOT EXISTS (SELECT 1 FROM customer_information LIMIT 1);


INSERT INTO employee_information (name, add1, desig_id, department, doj, sl_total, sl_bal, cl_total, cl_bal, spl_total, spl_bal, is_active)
SELECT rows.ename, rows.addr,
       (SELECT id FROM employee_designation WHERE name = rows.desig_name),
       rows.dept, rows.doj::DATE,
       15, 15, 12, 12, 6, 6, 1
FROM (VALUES
    ('Rajesh Kumar',  'Staff Quarters Block A', 'Manager',       'Management',  '2020-01-15'),
    ('Meena Sharma',  'Staff Quarters Block B', 'Receptionist',  'Front Desk',  '2021-03-01'),
    ('Suresh Nair',   'Staff Quarters Block A', 'Chef',          'Kitchen',     '2019-06-10'),
    ('Kavita Rao',    'Staff Quarters Block C', 'Cashier',       'Accounts',    '2022-01-05'),
    ('Arjun Singh',   'Staff Quarters Block B', 'Waiter',        'F&B',         '2022-05-15'),
    ('Pooja Desai',   'Staff Quarters Block C', 'Housekeeping',  'Housekeeping','2021-08-20'),
    ('Mohan Pillai',  'Staff Quarters Block A', 'Captain',       'F&B',         '2020-11-01'),
    ('Geeta Verma',   'Staff Quarters Block B', 'Asst. Manager', 'Management',  '2021-01-10')
) AS rows(ename, addr, desig_name, dept, doj)
WHERE NOT EXISTS (SELECT 1 FROM employee_information LIMIT 1);



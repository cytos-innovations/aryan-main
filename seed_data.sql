-- ================================================================
-- POS App - SEED / SAMPLE DATA  (for testing on a fresh install)
-- ================================================================
-- Run AFTER the tables are created (the Tauri backend auto-creates
-- them on first connection, or run src/schema.sql first).
--
-- Covers EVERY master / reference table EXCEPT:
--   * applications, user_applications, permissions, user_permissions
--     (these are auto-seeded by the backend)
--   * all "billing screen" / transaction tables
--     (order_session, order_item, order_item_modifier, kot_master,
--      kot_item, bill_master, bill_item, bill_tax_detail,
--      payment_master, payment_part_detail, settlement_master,
--      customer_due_ledger, order_status_history,
--      table_session_history, reservation_master)
--
-- NOTE: All seeded users share password = "123456"
--       (bcrypt hash below). created_by/updated_by = 1 throughout.
-- ================================================================

BEGIN;

-- ================================================================
-- USERS  (password for everyone = "123456")
-- ================================================================
INSERT INTO users (id, user_name, password_hash, is_super, is_active, created_by, updated_by) VALUES
(1,  'admin',    '$2b$12$biXM2sp8UBqNK38XPqrjKeI4phyUMCdO1k.wudGR8/5ozVVnqAMAK', 1, 1, 1, 1),
(2,  'manager',  '$2b$12$biXM2sp8UBqNK38XPqrjKeI4phyUMCdO1k.wudGR8/5ozVVnqAMAK', 0, 1, 1, 1),
(3,  'cashier1', '$2b$12$biXM2sp8UBqNK38XPqrjKeI4phyUMCdO1k.wudGR8/5ozVVnqAMAK', 0, 1, 1, 1),
(4,  'cashier2', '$2b$12$biXM2sp8UBqNK38XPqrjKeI4phyUMCdO1k.wudGR8/5ozVVnqAMAK', 0, 1, 1, 1),
(5,  'waiter1',  '$2b$12$biXM2sp8UBqNK38XPqrjKeI4phyUMCdO1k.wudGR8/5ozVVnqAMAK', 0, 1, 1, 1),
(6,  'waiter2',  '$2b$12$biXM2sp8UBqNK38XPqrjKeI4phyUMCdO1k.wudGR8/5ozVVnqAMAK', 0, 1, 1, 1),
(7,  'steward',  '$2b$12$biXM2sp8UBqNK38XPqrjKeI4phyUMCdO1k.wudGR8/5ozVVnqAMAK', 0, 1, 1, 1),
(8,  'accountant','$2b$12$biXM2sp8UBqNK38XPqrjKeI4phyUMCdO1k.wudGR8/5ozVVnqAMAK', 0, 1, 1, 1);


-- ================================================================
-- UNITS
-- ================================================================
INSERT INTO units (id, name, is_active, created_by, updated_by) VALUES
(1,'Nos',1,1,1),(2,'Kg',1,1,1),(3,'Gram',1,1,1),(4,'Litre',1,1,1),
(5,'ML',1,1,1),(6,'Plate',1,1,1),(7,'Piece',1,1,1),(8,'Dozen',1,1,1),
(9,'Packet',1,1,1),(10,'Bottle',1,1,1),(11,'Glass',1,1,1),(12,'Bowl',1,1,1),
(13,'Half Plate',1,1,1),(14,'Quarter Plate',1,1,1),(15,'Full Plate',1,1,1),
(16,'Pint',1,1,1),(17,'Peg (30ml)',1,1,1),(18,'Large Peg (60ml)',1,1,1),
(19,'Pitcher',1,1,1),(20,'Jug',1,1,1),(21,'Cup',1,1,1),(22,'Pot',1,1,1),
(23,'Tray',1,1,1),(24,'Box',1,1,1),(25,'Slice',1,1,1),(26,'Scoop',1,1,1),
(27,'Combo',1,1,1),(28,'Per Person',1,1,1),(29,'Bucket',1,1,1),(30,'Can',1,1,1),
(31,'Tin',1,1,1),(32,'Sachet',1,1,1),(33,'Quintal',1,1,1),(34,'Pound (Lbs)',1,1,1),
(35,'Tablespoon',1,1,1),(36,'Teaspoon',1,1,1),(37,'Inch',1,1,1),(38,'Meter',1,1,1);

-- ================================================================
-- TALLY MASTER
-- ================================================================
INSERT INTO tally_master (id, name, is_active, created_by, updated_by) VALUES
(1,'Food Sales',1,1,1),(2,'Liquor Sales',1,1,1),(3,'Beverage Sales',1,1,1),
(4,'CGST Output',1,1,1),(5,'SGST Output',1,1,1),(6,'IGST Output',1,1,1),
(7,'Cash Account',1,1,1),(8,'Bank Account',1,1,1),(9,'Purchase Account',1,1,1),
(10,'Sundry Debtors',1,1,1),(11,'Sundry Creditors',1,1,1),(12,'Service Charge',1,1,1);

-- ================================================================
-- ACCOUNT CATEGORIES
-- ================================================================
INSERT INTO account_categories (id, name, category_type, is_active, created_by, updated_by) VALUES
(1,'Assets','Asset',1,1,1),
(2,'Liabilities','Liability',1,1,1),
(3,'Equity','Equity',1,1,1),
(4,'Income','Income',1,1,1),
(5,'Expenses','Expense',1,1,1);

-- ================================================================
-- ACCOUNT GROUPS
-- ================================================================
INSERT INTO account_groups (id, name, category_id, is_active, created_by, updated_by) VALUES
(1,'Current Assets',1,1,1,1),
(2,'Fixed Assets',1,1,1,1),
(3,'Bank Accounts',1,1,1,1),
(4,'Cash in Hand',1,1,1,1),
(5,'Current Liabilities',2,1,1,1),
(6,'Loans & Advances',2,1,1,1),
(7,'Sundry Creditors',2,1,1,1),
(8,'Capital Account',3,1,1,1),
(9,'Sales Account',4,1,1,1),
(10,'Direct Income',4,1,1,1),
(11,'Direct Expenses',5,1,1,1),
(12,'Indirect Expenses',5,1,1,1);

-- ================================================================
-- GENERAL LEDGER
-- ================================================================
INSERT INTO general_ledger
(id, name, prev_bal, prev_crdr, close_bal, close_crdr, open_bal, open_crdr, grp_code, sub_led, book_flg, sg_flg, flag, user_id, company_sr, is_active, created_by, updated_by) VALUES
(1, 'Cash Account',          50000,'D', 75000,'D', 50000,'D', 4,'N','Y','N','A','admin',1,1,1,1),
(2, 'HDFC Bank',            120000,'D',150000,'D',120000,'D', 3,'N','Y','N','A','admin',1,1,1,1),
(3, 'ICICI Bank',            80000,'D', 95000,'D', 80000,'D', 3,'N','Y','N','A','admin',1,1,1,1),
(4, 'Food Sales',                0,'C',450000,'C',     0,'C', 9,'N','Y','Y','A','admin',1,1,1,1),
(5, 'Liquor Sales',              0,'C',220000,'C',     0,'C', 9,'N','Y','Y','A','admin',1,1,1,1),
(6, 'Beverage Sales',            0,'C', 90000,'C',     0,'C', 9,'N','Y','Y','A','admin',1,1,1,1),
(7, 'CGST Payable',              0,'C', 25000,'C',     0,'C', 5,'N','Y','N','A','admin',1,1,1,1),
(8, 'SGST Payable',              0,'C', 25000,'C',     0,'C', 5,'N','Y','N','A','admin',1,1,1,1),
(9, 'IGST Payable',              0,'C',  5000,'C',     0,'C', 5,'N','Y','N','A','admin',1,1,1,1),
(10,'Purchase - Provisions',     0,'D',180000,'D',     0,'D',11,'N','Y','N','A','admin',1,1,1,1),
(11,'Salaries & Wages',          0,'D',150000,'D',     0,'D',12,'N','Y','N','A','admin',1,1,1,1),
(12,'Rent Account',              0,'D', 60000,'D',     0,'D',12,'N','Y','N','A','admin',1,1,1,1),
(13,'Electricity Charges',       0,'D', 35000,'D',     0,'D',12,'N','Y','N','A','admin',1,1,1,1),
(14,'Capital Account',     500000,'C',500000,'C',500000,'C', 8,'N','Y','N','A','admin',1,1,1,1),
(15,'Service Charge Collected',  0,'C', 18000,'C',     0,'C',10,'N','Y','N','A','admin',1,1,1,1);

-- ================================================================
-- TAX MASTER
-- ================================================================
INSERT INTO tax_master (id, name, tally_id, gl_id, is_active, created_by, updated_by) VALUES
(1,'CGST',4,7,1,1,1),
(2,'SGST',5,8,1,1,1),
(3,'IGST',6,9,1,1,1),
(4,'VAT',2,5,1,1,1),
(5,'Service Charge',12,15,1,1,1),
(6,'GST 5%',4,7,1,1,1),
(7,'GST 12%',4,7,1,1,1),
(8,'GST 18%',4,7,1,1,1);

-- ================================================================
-- TAX SLAB
-- ================================================================
INSERT INTO tax_slab (id, tax_master_id, slab_from, slab_to, tax_percentage, is_active, created_by, updated_by) VALUES
(1, 1,    0,   1000, 2.5, 1,1,1),
(2, 1, 1000, 999999, 2.5, 1,1,1),
(3, 2,    0,   1000, 2.5, 1,1,1),
(4, 2, 1000, 999999, 2.5, 1,1,1),
(5, 3,    0, 999999, 5.0, 1,1,1),
(6, 4,    0, 999999,20.0, 1,1,1),
(7, 5,    0, 999999,10.0, 1,1,1),
(8, 6,    0, 999999, 5.0, 1,1,1),
(9, 7,    0, 999999,12.0, 1,1,1),
(10,8,    0, 999999,18.0, 1,1,1),
(11,1, 5000, 999999, 9.0, 1,1,1),
(12,2, 5000, 999999, 9.0, 1,1,1);

-- ================================================================
-- FOOD TYPE
-- ================================================================
INSERT INTO food_type (id, name, is_active, created_by, updated_by) VALUES
(1,'Veg',TRUE,1,1),(2,'Non-Veg',TRUE,1,1),(3,'Egg',TRUE,1,1),
(4,'Vegan',TRUE,1,1),(5,'Jain',TRUE,1,1),(6,'Beverage',TRUE,1,1),
(13,'Liquor',TRUE,1,1),(14,'Mocktail',TRUE,1,1),(15,'Cocktail',TRUE,1,1),
(16,'Continental',TRUE,1,1),(17,'Chinese',TRUE,1,1),(18,'Tandoori',TRUE,1,1),
(19,'Seafood',TRUE,1,1),(20,'Chicken',TRUE,1,1),(21,'Mutton',TRUE,1,1),
(22,'Fish',TRUE,1,1),(23,'Prawns',TRUE,1,1),(24,'Dessert',TRUE,1,1),
(25,'Bakery',TRUE,1,1),(26,'Gluten-Free',TRUE,1,1),(27,'Combo/Thali',TRUE,1,1);

-- ================================================================
-- KITCHEN SECTION
-- ================================================================
INSERT INTO kitchen_section (id, name, is_print_enabled, printer_name, printer_type, is_active, created_by, updated_by) VALUES
(1,'Main Kitchen',TRUE,'KITCHEN-PRN','THERMAL',TRUE,1,1),
(2,'Tandoor',TRUE,'TANDOOR-PRN','THERMAL',TRUE,1,1),
(3,'Chinese Counter',TRUE,'CHINESE-PRN','THERMAL',TRUE,1,1),
(4,'Bar',TRUE,'BAR-PRN','THERMAL',TRUE,1,1),
(5,'Bakery',TRUE,'BAKERY-PRN','THERMAL',TRUE,1,1),
(6,'Cold Kitchen',FALSE,'COLD-PRN','THERMAL',TRUE,1,1),
(7,'Pizza Station',TRUE,'PIZZA-PRN','THERMAL',TRUE,1,1),
(8,'South Indian',TRUE,'SOUTH-PRN','THERMAL',TRUE,1,1);

-- ================================================================
-- MENU CATEGORY
-- ================================================================
INSERT INTO menu_category (id, category_type, name, tally_code, allow_discount, max_discount_percent, auto_discount_percent, unit_id, is_active, created_by, updated_by) VALUES
(1,'F','Starters',1,TRUE,20,0,6,TRUE,1,1),
(2,'F','Main Course',1,TRUE,15,0,6,TRUE,1,1),
(3,'F','Breads',1,FALSE,0,0,7,TRUE,1,1),
(4,'F','Rice & Biryani',1,TRUE,10,0,6,TRUE,1,1),
(5,'F','Chinese',1,TRUE,15,0,6,TRUE,1,1),
(6,'F','South Indian',1,TRUE,10,0,6,TRUE,1,1),
(7,'F','Desserts',1,TRUE,10,0,6,TRUE,1,1),
(8,'F','Soups',1,FALSE,0,0,12,TRUE,1,1),
(9,'F','Salads',1,FALSE,0,0,6,TRUE,1,1),
(10,'B','Beverages',3,FALSE,0,0,11,TRUE,1,1),
(11,'L','Liquor',2,FALSE,0,0,10,TRUE,1,1),
(12,'F','Tandoori',1,TRUE,15,0,6,TRUE,1,1);

-- ================================================================
-- MENU CATEGORY TAX DETAIL
-- ================================================================
INSERT INTO menu_category_tax_detail (id, category_id, tax_id, tax_percentage, is_active, created_by, updated_by) VALUES
(1,1,1,2.5,TRUE,1,1),(2,1,2,2.5,TRUE,1,1),
(3,2,1,2.5,TRUE,1,1),(4,2,2,2.5,TRUE,1,1),
(5,3,1,2.5,TRUE,1,1),(6,3,2,2.5,TRUE,1,1),
(7,4,1,2.5,TRUE,1,1),(8,4,2,2.5,TRUE,1,1),
(9,5,1,2.5,TRUE,1,1),(10,5,2,2.5,TRUE,1,1),
(11,10,8,18.0,TRUE,1,1),
(12,11,4,20.0,TRUE,1,1),
(13,7,6,5.0,TRUE,1,1),
(14,12,1,2.5,TRUE,1,1),(15,12,2,2.5,TRUE,1,1);

-- ================================================================
-- MENU GROUP
-- ================================================================
INSERT INTO menu_group (id, name, category_id, multiple_recipe, as_per_size, menu_grp_image, is_active, created_by, updated_by) VALUES
(1,'Veg Starters',1,'N','N',NULL,TRUE,1,1),
(2,'Non-Veg Starters',1,'N','N',NULL,TRUE,1,1),
(3,'Paneer Specials',2,'Y','N',NULL,TRUE,1,1),
(4,'Chicken Curries',2,'Y','N',NULL,TRUE,1,1),
(5,'Mutton Specials',2,'Y','N',NULL,TRUE,1,1),
(6,'Indian Breads',3,'N','N',NULL,TRUE,1,1),
(7,'Biryani',4,'Y','Y',NULL,TRUE,1,1),
(8,'Fried Rice',5,'N','N',NULL,TRUE,1,1),
(9,'Noodles',5,'N','N',NULL,TRUE,1,1),
(10,'Dosa',6,'N','N',NULL,TRUE,1,1),
(11,'Ice Creams',7,'N','N',NULL,TRUE,1,1),
(12,'Soups',8,'N','N',NULL,TRUE,1,1),
(13,'Fresh Juices',10,'N','N',NULL,TRUE,1,1),
(14,'Beers',11,'N','N',NULL,TRUE,1,1),
(15,'Tandoori',12,'Y','Y',NULL,TRUE,1,1);

-- ================================================================
-- MENU CARD  (40 items)
-- ================================================================
INSERT INTO menu_card (id, item_barcode, name, menu_alias, menu_group_id, kitchen_section_id, liquor_group_id, food_type_id, rate_1, rate_2, rate_3, rate_4, rate_5, consume_quantity, excise_rate, comments, is_active, created_by, updated_by) VALUES
(1,'MC0001','Paneer Tikka','Pnr Tikka',1,2,NULL,1,220,240,260,280,300,1,0,'Bestseller',TRUE,1,1),
(2,'MC0002','Veg Manchurian','Veg Manch',1,3,NULL,1,180,195,210,225,240,1,0,NULL,TRUE,1,1),
(3,'MC0003','Hara Bhara Kabab','Hara Kabab',1,2,NULL,1,200,215,230,245,260,1,0,NULL,TRUE,1,1),
(4,'MC0004','Crispy Corn','Crispy Corn',1,3,NULL,1,170,185,200,215,230,1,0,NULL,TRUE,1,1),
(5,'MC0005','Mushroom 65','Mush 65',1,3,NULL,1,210,225,240,255,270,1,0,NULL,TRUE,1,1),
(6,'MC0006','Chicken Tikka','Chk Tikka',2,2,NULL,2,260,280,300,320,340,1,0,'Bestseller',TRUE,1,1),
(7,'MC0007','Chicken 65','Chk 65',2,3,NULL,2,240,260,280,300,320,1,0,NULL,TRUE,1,1),
(8,'MC0008','Fish Amritsari','Fish Amrt',2,2,NULL,2,320,340,360,380,400,1,0,NULL,TRUE,1,1),
(9,'MC0009','Mutton Seekh Kabab','Mtn Seekh',2,2,NULL,2,340,360,380,400,420,1,0,NULL,TRUE,1,1),
(10,'MC0010','Prawns Koliwada','Prawn Koli',2,3,NULL,2,420,440,460,480,500,1,0,NULL,TRUE,1,1),
(11,'MC0011','Paneer Butter Masala','PBM',3,1,NULL,1,260,280,300,320,340,1,0,'Bestseller',TRUE,1,1),
(12,'MC0012','Kadai Paneer','Kadai Pnr',3,1,NULL,1,250,270,290,310,330,1,0,NULL,TRUE,1,1),
(13,'MC0013','Palak Paneer','Palak Pnr',3,1,NULL,1,240,260,280,300,320,1,0,NULL,TRUE,1,1),
(14,'MC0014','Shahi Paneer','Shahi Pnr',3,1,NULL,1,270,290,310,330,350,1,0,NULL,TRUE,1,1),
(15,'MC0015','Butter Chicken','Btr Chk',4,1,NULL,2,320,340,360,380,400,1,0,'Bestseller',TRUE,1,1),
(16,'MC0016','Chicken Curry','Chk Curry',4,1,NULL,2,290,310,330,350,370,1,0,NULL,TRUE,1,1),
(17,'MC0017','Chicken Chettinad','Chk Chett',4,1,NULL,2,310,330,350,370,390,1,0,NULL,TRUE,1,1),
(18,'MC0018','Kadai Chicken','Kadai Chk',4,1,NULL,2,300,320,340,360,380,1,0,NULL,TRUE,1,1),
(19,'MC0019','Mutton Rogan Josh','Rogan Josh',5,1,NULL,2,380,400,420,440,460,1,0,NULL,TRUE,1,1),
(20,'MC0020','Mutton Handi','Mtn Handi',5,1,NULL,2,400,420,440,460,480,1,0,NULL,TRUE,1,1),
(21,'MC0021','Tandoori Roti','T-Roti',6,2,NULL,1,25,28,30,32,35,1,0,NULL,TRUE,1,1),
(22,'MC0022','Butter Naan','Btr Naan',6,2,NULL,1,40,45,50,55,60,1,0,NULL,TRUE,1,1),
(23,'MC0023','Garlic Naan','Grlc Naan',6,2,NULL,1,55,60,65,70,75,1,0,NULL,TRUE,1,1),
(24,'MC0024','Laccha Paratha','Laccha',6,2,NULL,1,45,50,55,60,65,1,0,NULL,TRUE,1,1),
(25,'MC0025','Veg Biryani','Veg Biry',7,1,NULL,1,220,240,260,280,300,1,0,NULL,TRUE,1,1),
(26,'MC0026','Chicken Biryani','Chk Biry',7,1,NULL,2,280,300,320,340,360,1,0,'Bestseller',TRUE,1,1),
(27,'MC0027','Mutton Biryani','Mtn Biry',7,1,NULL,2,340,360,380,400,420,1,0,NULL,TRUE,1,1),
(28,'MC0028','Egg Biryani','Egg Biry',7,1,NULL,3,200,220,240,260,280,1,0,NULL,TRUE,1,1),
(29,'MC0029','Veg Fried Rice','Veg FR',8,3,NULL,1,160,175,190,205,220,1,0,NULL,TRUE,1,1),
(30,'MC0030','Chicken Fried Rice','Chk FR',8,3,NULL,2,190,205,220,235,250,1,0,NULL,TRUE,1,1),
(31,'MC0031','Hakka Noodles','Hakka',9,3,NULL,1,170,185,200,215,230,1,0,NULL,TRUE,1,1),
(32,'MC0032','Schezwan Noodles','Schz Ndl',9,3,NULL,1,190,205,220,235,250,1,0,NULL,TRUE,1,1),
(33,'MC0033','Masala Dosa','Msl Dosa',10,8,NULL,1,120,130,140,150,160,1,0,NULL,TRUE,1,1),
(34,'MC0034','Plain Dosa','Pln Dosa',10,8,NULL,1,90,100,110,120,130,1,0,NULL,TRUE,1,1),
(35,'MC0035','Vanilla Ice Cream','Vanilla',11,6,NULL,1,80,90,100,110,120,1,0,NULL,TRUE,1,1),
(36,'MC0036','Gulab Jamun','G Jamun',11,5,NULL,1,90,100,110,120,130,1,0,NULL,TRUE,1,1),
(37,'MC0037','Tomato Soup','Tom Soup',12,1,NULL,1,110,120,130,140,150,1,0,NULL,TRUE,1,1),
(38,'MC0038','Sweet Corn Soup','SC Soup',12,1,NULL,1,120,130,140,150,160,1,0,NULL,TRUE,1,1),
(39,'MC0039','Fresh Lime Soda','Lime Soda',13,6,NULL,6,60,70,80,90,100,1,0,NULL,TRUE,1,1),
(40,'MC0040','Kingfisher Beer','KF Beer',14,4,1,6,180,200,220,240,260,1,0,'MRP based',TRUE,1,1);

-- ================================================================
-- CAL INCENTIVE  (waiter incentive per menu item)
-- ================================================================
INSERT INTO cal_incentive (id, menu_card_id, sunday_inc, monday_inc, tuesday_inc, wednesday_inc, thursday_inc, friday_inc, saturday_inc, is_active, created_by, updated_by) VALUES
(1,1,5,5,5,5,5,7,7,TRUE,1,1),
(2,6,6,6,6,6,6,8,8,TRUE,1,1),
(3,11,5,5,5,5,5,6,6,TRUE,1,1),
(4,15,7,7,7,7,7,9,9,TRUE,1,1),
(5,19,8,8,8,8,8,10,10,TRUE,1,1),
(6,26,6,6,6,6,6,8,8,TRUE,1,1),
(7,27,8,8,8,8,8,10,10,TRUE,1,1),
(8,8,6,6,6,6,6,8,8,TRUE,1,1),
(9,9,7,7,7,7,7,9,9,TRUE,1,1),
(10,10,9,9,9,9,9,11,11,TRUE,1,1),
(11,40,4,4,4,4,4,5,5,TRUE,1,1),
(12,2,4,4,4,4,4,5,5,TRUE,1,1),
(13,7,5,5,5,5,5,7,7,TRUE,1,1),
(14,20,8,8,8,8,8,10,10,TRUE,1,1),
(15,16,6,6,6,6,6,8,8,TRUE,1,1);

-- ================================================================
-- MENU RECIPE
-- ================================================================
INSERT INTO menu_recipe (id, menu_id, ingredient_name, quantity, unit_id, is_active, created_by, updated_by) VALUES
(1,1,'Paneer',200,3,TRUE,1,1),
(2,1,'Curd',50,3,TRUE,1,1),
(3,1,'Capsicum',50,3,TRUE,1,1),
(4,11,'Paneer',180,3,TRUE,1,1),
(5,11,'Butter',30,3,TRUE,1,1),
(6,11,'Tomato Puree',100,5,TRUE,1,1),
(7,15,'Chicken',250,3,TRUE,1,1),
(8,15,'Butter',40,3,TRUE,1,1),
(9,15,'Cream',50,5,TRUE,1,1),
(10,26,'Basmati Rice',200,3,TRUE,1,1),
(11,26,'Chicken',200,3,TRUE,1,1),
(12,26,'Biryani Masala',20,3,TRUE,1,1),
(13,19,'Mutton',300,3,TRUE,1,1),
(14,19,'Onion',100,3,TRUE,1,1),
(15,22,'Maida',100,3,TRUE,1,1),
(16,22,'Butter',20,3,TRUE,1,1),
(17,29,'Rice',200,3,TRUE,1,1),
(18,29,'Mixed Veg',100,3,TRUE,1,1),
(19,37,'Tomato',150,3,TRUE,1,1),
(20,40,'Beer Bottle',1,10,TRUE,1,1);

-- ================================================================
-- TABLE GROUP
-- ================================================================
INSERT INTO table_group (id, name, allow_incentive, is_home_delivery, is_takeaway_enabled, is_tax_applicable, printer_location, is_print_enabled, service_printer_name, applicable_rate, is_active, created_by, updated_by) VALUES
(1,'AC Hall','Y','N','N','Y','Floor 1','Y','SRV-AC',2,TRUE,1,1),
(2,'Non-AC Hall','Y','N','N','Y','Floor 1','Y','SRV-NONAC',1,TRUE,1,1),
(3,'Family Room','Y','N','N','Y','Floor 2','Y','SRV-FAM',2,TRUE,1,1),
(4,'Rooftop','Y','N','N','Y','Terrace','Y','SRV-ROOF',3,TRUE,1,1),
(5,'Bar Section','Y','N','N','Y','Floor 1','Y','SRV-BAR',2,TRUE,1,1),
(6,'Takeaway/Delivery','N','Y','Y','Y','Counter','Y','SRV-CNT',1,TRUE,1,1);

-- ================================================================
-- RESTAURANT TABLE  (30 tables)
-- ================================================================
INSERT INTO restaurant_table (id, table_name, is_home_delivery, table_lock_status, outlet_name, is_tax_applicable, applicable_rate, table_group_id, current_status, is_active, created_by, updated_by) VALUES
(1,'1','N','UNLOCKED','Main Outlet','Y',2,1,'AVAILABLE',TRUE,1,1),
(2,'2','N','UNLOCKED','Main Outlet','Y',2,1,'AVAILABLE',TRUE,1,1),
(3,'3','N','UNLOCKED','Main Outlet','Y',2,1,'AVAILABLE',TRUE,1,1),
(4,'4','N','UNLOCKED','Main Outlet','Y',2,1,'AVAILABLE',TRUE,1,1),
(5,'5','N','UNLOCKED','Main Outlet','Y',2,1,'AVAILABLE',TRUE,1,1),
(6,'6','N','UNLOCKED','Main Outlet','Y',2,1,'AVAILABLE',TRUE,1,1),
(7,'7','N','UNLOCKED','Main Outlet','Y',1,2,'AVAILABLE',TRUE,1,1),
(8,'8','N','UNLOCKED','Main Outlet','Y',1,2,'AVAILABLE',TRUE,1,1),
(9,'9','N','UNLOCKED','Main Outlet','Y',1,2,'AVAILABLE',TRUE,1,1),
(10,'10','N','UNLOCKED','Main Outlet','Y',1,2,'AVAILABLE',TRUE,1,1),
(11,'11','N','UNLOCKED','Main Outlet','Y',1,2,'AVAILABLE',TRUE,1,1),
(12,'12','N','UNLOCKED','Main Outlet','Y',1,2,'AVAILABLE',TRUE,1,1),
(13,'13','N','UNLOCKED','Main Outlet','Y',2,3,'AVAILABLE',TRUE,1,1),
(14,'14','N','UNLOCKED','Main Outlet','Y',2,3,'AVAILABLE',TRUE,1,1),
(15,'15','N','UNLOCKED','Main Outlet','Y',2,3,'AVAILABLE',TRUE,1,1),
(16,'16','N','UNLOCKED','Main Outlet','Y',2,3,'AVAILABLE',TRUE,1,1),
(17,'17','N','UNLOCKED','Main Outlet','Y',3,4,'AVAILABLE',TRUE,1,1),
(18,'18','N','UNLOCKED','Main Outlet','Y',3,4,'AVAILABLE',TRUE,1,1),
(19,'19','N','UNLOCKED','Main Outlet','Y',3,4,'AVAILABLE',TRUE,1,1),
(20,'20','N','UNLOCKED','Main Outlet','Y',3,4,'AVAILABLE',TRUE,1,1),
(21,'21','N','UNLOCKED','Main Outlet','Y',3,4,'AVAILABLE',TRUE,1,1),
(22,'22','N','UNLOCKED','Main Outlet','Y',2,5,'AVAILABLE',TRUE,1,1),
(23,'23','N','UNLOCKED','Main Outlet','Y',2,5,'AVAILABLE',TRUE,1,1),
(24,'24','N','UNLOCKED','Main Outlet','Y',2,5,'AVAILABLE',TRUE,1,1),
(25,'25','N','UNLOCKED','Main Outlet','Y',2,5,'AVAILABLE',TRUE,1,1),
(26,'26','Y','UNLOCKED','Main Outlet','Y',1,6,'AVAILABLE',TRUE,1,1),
(27,'27','Y','UNLOCKED','Main Outlet','Y',1,6,'AVAILABLE',TRUE,1,1),
(28,'28','Y','UNLOCKED','Main Outlet','Y',1,6,'AVAILABLE',TRUE,1,1),
(29,'29','Y','UNLOCKED','Main Outlet','Y',1,6,'AVAILABLE',TRUE,1,1),
(30,'30','Y','UNLOCKED','Main Outlet','Y',1,6,'AVAILABLE',TRUE,1,1);

-- ================================================================
-- BILL MESSAGE
-- ================================================================
INSERT INTO bill_message (id, message_text, valid_from, valid_to, is_active, created_by, updated_by) VALUES
(1,'Thank You! Visit Again','2026-01-01 00:00:00','2026-12-31 23:59:59',TRUE,1,1),
(2,'GST No: 27ABCDE1234F1Z5','2026-01-01 00:00:00','2026-12-31 23:59:59',TRUE,1,1),
(3,'Food prepared fresh daily','2026-01-01 00:00:00','2026-12-31 23:59:59',TRUE,1,1),
(4,'Free WiFi: GUEST/guest123','2026-01-01 00:00:00','2026-12-31 23:59:59',TRUE,1,1),
(5,'Follow us @cytosrestaurant','2026-01-01 00:00:00','2026-12-31 23:59:59',TRUE,1,1),
(6,'Happy Hours 4PM-7PM','2026-06-01 00:00:00','2026-08-31 23:59:59',TRUE,1,1),
(7,'Home Delivery: 1800-123-456','2026-01-01 00:00:00','2026-12-31 23:59:59',TRUE,1,1),
(8,'No refund on packed food','2026-01-01 00:00:00','2026-12-31 23:59:59',TRUE,1,1);

-- ================================================================
-- KOT MESSAGE
-- ================================================================
INSERT INTO kot_message (id, kot_message, is_active, created_by, updated_by) VALUES
(1,'Less Spicy',TRUE,1,1),
(2,'Extra Spicy',TRUE,1,1),
(3,'No Onion No Garlic',TRUE,1,1),
(4,'Jain Preparation',TRUE,1,1),
(5,'No Salt',TRUE,1,1),
(6,'Extra Gravy',TRUE,1,1),
(7,'Half Plate',TRUE,1,1),
(8,'Serve Quick',TRUE,1,1),
(9,'Less Oil',TRUE,1,1),
(10,'Without Cheese',TRUE,1,1);

-- ================================================================
-- DISCOUNT DETAIL
-- ================================================================
INSERT INTO discount_detail (id, name, discount_percent, ledger_id, is_active, created_by, updated_by) VALUES
(1,'No Discount',0,15,TRUE,1,1),
(2,'Staff Discount',10,15,TRUE,1,1),
(3,'Loyalty 5%',5,15,TRUE,1,1),
(4,'Festival Offer 15%',15,15,TRUE,1,1),
(5,'Senior Citizen 10%',10,15,TRUE,1,1),
(6,'Corporate 12%',12,15,TRUE,1,1),
(7,'Weekend Special 8%',8,15,TRUE,1,1),
(8,'Manager Special 20%',20,15,TRUE,1,1);

-- ================================================================
-- IDENTITY TYPE
-- ================================================================
INSERT INTO identity_type (id, name, is_active, created_by, updated_by) VALUES
(1,'Aadhaar Card',TRUE,1,1),
(2,'PAN Card',TRUE,1,1),
(3,'Driving License',TRUE,1,1),
(4,'Passport',TRUE,1,1),
(5,'Voter ID',TRUE,1,1),
(6,'Company ID',TRUE,1,1);

-- ================================================================
-- MARKET SEGMENT
-- ================================================================
INSERT INTO market_segment (id, name, is_active, created_by, updated_by) VALUES
(1,'MakeMyTrip',TRUE,1,1),
(2,'Booking.com',TRUE,1,1),
(3,'Online (Zomato)',TRUE,1,1),
(4,'Online (Swiggy)',TRUE,1,1),
(5,'Travel Agent',TRUE,1,1),
(6,'Banquet',TRUE,1,1),
(7,'Loyalty Member',TRUE,1,1),
(8,'Government',TRUE,1,1);

-- ================================================================
-- PLAN MASTER
-- ================================================================
INSERT INTO plan_master (id, name, tariff, plan_details, is_active, created_by, updated_by) VALUES
(1,'EP - European Plan',0,'Room only, no meals',TRUE,1,1),
(2,'CP - Continental Plan',350,'Room + Breakfast',TRUE,1,1),
(3,'MAP - Modified American',750,'Room + Breakfast + 1 Meal',TRUE,1,1),
(4,'AP - American Plan',1200,'Room + All Meals',TRUE,1,1),
(5,'Banquet Veg Buffet',650,'Unlimited veg buffet',TRUE,1,1),
(6,'Banquet Non-Veg Buffet',850,'Unlimited non-veg buffet',TRUE,1,1);

-- ================================================================
-- STATE MASTER
-- ================================================================
INSERT INTO state_master (id, name, is_active, created_by, updated_by) VALUES
(1,'Maharashtra',1,1,1),(2,'Gujarat',1,1,1),(3,'Karnataka',1,1,1),
(4,'Tamil Nadu',1,1,1),(5,'Delhi',1,1,1),(6,'Rajasthan',1,1,1),
(7,'Uttar Pradesh',1,1,1),(8,'West Bengal',1,1,1),(9,'Kerala',1,1,1),
(10,'Telangana',1,1,1),(11,'Punjab',1,1,1),(12,'Madhya Pradesh',1,1,1),
(13,'Goa',1,1,1),(14,'Haryana',1,1,1),(15,'Andhra Pradesh',1,1,1);

-- ================================================================
-- CITY MASTER
-- ================================================================
INSERT INTO city_master (id, name, is_active, created_by, updated_by) VALUES
(1,'Mumbai',1,1,1),(2,'Pune',1,1,1),(3,'Nagpur',1,1,1),(4,'Nashik',1,1,1),
(5,'Ahmedabad',1,1,1),(6,'Surat',1,1,1),(7,'Bengaluru',1,1,1),(8,'Mysuru',1,1,1),
(9,'Chennai',1,1,1),(10,'Coimbatore',1,1,1),(11,'New Delhi',1,1,1),(12,'Jaipur',1,1,1),
(13,'Lucknow',1,1,1),(14,'Kolkata',1,1,1),(15,'Kochi',1,1,1),(16,'Hyderabad',1,1,1),
(17,'Amritsar',1,1,1),(18,'Indore',1,1,1),(19,'Panaji',1,1,1),(20,'Gurugram',1,1,1),
(21,'Thane',1,1,1),(22,'Navi Mumbai',1,1,1),(23,'Aurangabad',1,1,1),(24,'Solapur',1,1,1),
(25,'Kolhapur',1,1,1),(26,'Amravati',1,1,1),(27,'Sangli',1,1,1),(28,'Satara',1,1,1),
(29,'Ahmednagar',1,1,1),(30,'Jalgaon',1,1,1),(31,'Akola',1,1,1),(32,'Latur',1,1,1),
(33,'Nanded',1,1,1),(34,'Dhule',1,1,1),(35,'Chandrapur',1,1,1),(36,'Ratnagiri',1,1,1),
(37,'Wardha',1,1,1),(38,'Beed',1,1,1),(39,'Osmanabad',1,1,1),(40,'Parbhani',1,1,1);

-- ================================================================
-- CUSTOMER INFORMATION  (25 customers)
-- ================================================================
INSERT INTO customer_information (id, prefix, customer_name, address_line1, address_line2, address_line3, mobile_no1, mobile_no2, email_id, dob, state_id, city_id, zip_code, user_id, ledger_id, nationality, pan_card, is_active, created_by, updated_by) VALUES
(1,'Mr','Rahul Sharma','12 MG Road','Near Station','',  '9820011001','', 'rahul.sharma@gmail.com','1988-05-12',1,1,'400001',3,1,'Indian','ABCPS1234A',1,1,1),
(2,'Ms','Priya Patel','45 CG Road','Navrangpura','',     '9820011002','', 'priya.patel@gmail.com','1992-08-21',2,5,'380009',3,7,'Indian','ABCPP2234B',1,1,1),
(3,'Mr','Amit Verma','7 Brigade Road','','',             '9820011003','', 'amit.verma@yahoo.com','1985-01-30',3,7,'560001',4,2,'Indian','ABCPV3234C',1,1,1),
(4,'Mrs','Sneha Iyer','22 Anna Salai','T Nagar','',      '9820011004','', 'sneha.iyer@gmail.com','1990-11-15',4,9,'600017',4,1,'Indian','ABCPI4234D',1,1,1),
(5,'Mr','Vikram Singh','9 Connaught Place','','',        '9820011005','', 'vikram.singh@gmail.com','1983-03-09',5,11,'110001',5,2,'Indian','ABCPS5234E',1,1,1),
(6,'Mr','Karan Mehta','33 Marine Drive','','',           '9820011006','9820099006','karan.mehta@gmail.com','1995-07-25',1,1,'400002',5,1,'Indian','ABCPM6234F',1,1,1),
(7,'Ms','Anjali Desai','5 Law Garden','','',             '9820011007','', 'anjali.desai@gmail.com','1993-12-01',2,5,'380006',6,7,'Indian',NULL,1,1,1),
(8,'Mr','Rohan Joshi','18 FC Road','Shivajinagar','',    '9820011008','', 'rohan.joshi@gmail.com','1987-04-18',1,2,'411004',6,1,'Indian','ABCPJ7234G',1,1,1),
(9,'Mrs','Meera Nair','40 MG Road','','',                '9820011009','', 'meera.nair@gmail.com','1991-09-09',9,15,'682011',3,7,'Indian',NULL,1,1,1),
(10,'Mr','Suresh Reddy','11 Banjara Hills','','',        '9820011010','', 'suresh.reddy@gmail.com','1980-02-14',10,16,'500034',4,2,'Indian','ABCPR8234H',1,1,1),
(11,'Mr','Deepak Kumar','3 Hazratganj','','',            '9820011011','', 'deepak.kumar@gmail.com','1989-06-06',7,13,'226001',5,1,'Indian',NULL,1,1,1),
(12,'Ms','Pooja Gupta','27 Civil Lines','','',           '9820011012','', 'pooja.gupta@gmail.com','1994-10-19',7,13,'226001',5,1,'Indian',NULL,1,1,1),
(13,'Mr','Arjun Rao','8 Jubilee Hills','','',            '9820011013','', 'arjun.rao@gmail.com','1986-08-30',10,16,'500033',6,2,'Indian','ABCPR9234I',1,1,1),
(14,'Mrs','Kavita Shah','14 Ring Road','','',            '9820011014','', 'kavita.shah@gmail.com','1990-05-05',2,6,'395007',6,7,'Indian',NULL,1,1,1),
(15,'Mr','Manish Agarwal','19 Malviya Nagar','','',      '9820011015','', 'manish.a@gmail.com','1982-11-22',6,12,'302017',3,2,'Indian','ABCPA1235J',1,1,1),
(16,'Mr','Sanjay Pawar','21 Shivaji Nagar','','',        '9820011016','', 'sanjay.pawar@gmail.com','1984-07-07',1,2,'411005',3,1,'Indian',NULL,1,1,1),
(17,'Ms','Neha Kulkarni','6 Deccan','','',               '9820011017','', 'neha.k@gmail.com','1996-03-03',1,2,'411004',4,1,'Indian',NULL,1,1,1),
(18,'Mr','Imran Khan','30 Park Street','','',            '9820011018','', 'imran.khan@gmail.com','1988-12-12',8,14,'700016',4,2,'Indian','ABCPK1236K',1,1,1),
(19,'Mr','David Fernandes','2 Fontainhas','','',         '9820011019','', 'david.f@gmail.com','1991-01-25',13,19,'403001',5,1,'Indian',NULL,1,1,1),
(20,'Mrs','Sunita Rao','16 Jayanagar','','',             '9820011020','', 'sunita.rao@gmail.com','1979-09-28',3,7,'560011',5,7,'Indian','ABCPR1237L',1,1,1),
(21,'Mr','John Mathew','9 Marine Lines','','',           '9820011021','', 'john.mathew@gmail.com','1990-04-14',9,15,'682016',6,1,'Indian',NULL,1,1,1),
(22,'Mr','Rajesh Tiwari','24 Civil Lines','','',         '9820011022','', 'rajesh.t@gmail.com','1985-06-16',12,18,'452001',6,2,'Indian',NULL,1,1,1),
(23,'Ms','Ayesha Sheikh','41 Banjara Hills','','',       '9820011023','', 'ayesha.s@gmail.com','1997-08-08',10,16,'500034',3,7,'Indian',NULL,1,1,1),
(24,'Mr','Gaurav Malhotra','12 Sector 17','','',         '9820011024','', 'gaurav.m@gmail.com','1983-02-20',11,17,'160017',4,2,'Indian','ABCPM1238M',1,1,1),
(25,'Mr','Walk-in Guest','','','',                        '0000000000','', NULL,NULL,1,1,'400001',3,1,'Indian',NULL,1,1,1);

-- ================================================================
-- CUSTOMER DETAIL  (uploaded ID documents; binary left NULL)
-- ================================================================
INSERT INTO customer_detail (cust_id, document_detail, file_name, content_type, size, document_id, user_id, is_active, created_by, updated_by) VALUES
(1, NULL,'aadhaar_rahul.pdf','application/pdf',204800,'AADH-0001',3,1,1,1),
(2, NULL,'pan_priya.jpg','image/jpeg',102400,'PAN-0002',3,1,1,1),
(3, NULL,'dl_amit.pdf','application/pdf',153600,'DL-0003',4,1,1,1),
(5, NULL,'passport_vikram.pdf','application/pdf',307200,'PASS-0005',5,1,1,1),
(6, NULL,'aadhaar_karan.jpg','image/jpeg',98304,'AADH-0006',5,1,1,1),
(10,NULL,'pan_suresh.pdf','application/pdf',122880,'PAN-0010',4,1,1,1),
(13,NULL,'aadhaar_arjun.pdf','application/pdf',184320,'AADH-0013',6,1,1,1),
(15,NULL,'pan_manish.jpg','image/jpeg',110592,'PAN-0015',3,1,1,1),
(18,NULL,'voterid_imran.pdf','application/pdf',141312,'VOT-0018',4,1,1,1),
(24,NULL,'pan_gaurav.pdf','application/pdf',135168,'PAN-0024',4,1,1,1);

-- ================================================================
-- EMPLOYEE DESIGNATION
-- ================================================================
INSERT INTO employee_designation (id, name, salary, is_active, created_by, updated_by) VALUES
(1,'General Manager',60000,1,1,1),
(2,'Restaurant Manager',40000,1,1,1),
(3,'Head Chef',45000,1,1,1),
(4,'Sous Chef',30000,1,1,1),
(5,'Cook',22000,1,1,1),
(6,'Captain',20000,1,1,1),
(7,'Waiter',15000,1,1,1),
(8,'Steward',14000,1,1,1),
(9,'Cashier',18000,1,1,1),
(10,'Cleaner',12000,1,1,1);

-- ================================================================
-- EMPLOYEE INFORMATION  (20 staff)
-- ================================================================
INSERT INTO employee_information (id, name, add1, add2, add3, desig_id, department, esi_no, pf_no, doj, dol, sl_total, sl_bal, cl_total, cl_bal, spl_total, spl_bal, con_person_no, emer_ph_no, resi_ph_no, advance_tot, target, is_active, created_by, updated_by) VALUES
(1,'Ramesh Yadav','Andheri East','Mumbai','',1,'Management','ESI1001','PF1001','2020-01-15',NULL,12,8,12,10,5,5,'9700000001','9700000001','022-1111',0,500000,1,1,1),
(2,'Sunil Patil','Dadar','Mumbai','',2,'F&B','ESI1002','PF1002','2020-03-10',NULL,12,6,12,7,5,4,'9700000002','9700000002','022-1112',5000,400000,1,1,1),
(3,'Chef Antonio','Bandra','Mumbai','',3,'Kitchen','ESI1003','PF1003','2019-06-01',NULL,12,9,12,11,5,5,'9700000003','9700000003','022-1113',0,0,1,1,1),
(4,'Mohan Singh','Kurla','Mumbai','',4,'Kitchen','ESI1004','PF1004','2021-02-20',NULL,12,10,12,9,5,3,'9700000004','9700000004','022-1114',2000,0,1,1,1),
(5,'Ravi Kumar','Sion','Mumbai','',5,'Kitchen','ESI1005','PF1005','2021-05-11',NULL,12,11,12,12,5,5,'9700000005','9700000005','022-1115',0,0,1,1,1),
(6,'Ganesh More','Thane','Mumbai','',5,'Kitchen','ESI1006','PF1006','2022-01-05',NULL,12,12,12,12,5,5,'9700000006','9700000006','022-1116',0,0,1,1,1),
(7,'Arun Nair','Ghatkopar','Mumbai','',6,'Service','ESI1007','PF1007','2021-08-19',NULL,12,7,12,6,5,4,'9700000007','9700000007','022-1117',1000,200000,1,1,1),
(8,'Vijay Sharma','Vikhroli','Mumbai','',6,'Service','ESI1008','PF1008','2022-03-22',NULL,12,9,12,8,5,5,'9700000008','9700000008','022-1118',0,200000,1,1,1),
(9,'Santosh Jadhav','Mulund','Mumbai','',7,'Service','ESI1009','PF1009','2022-06-15',NULL,12,10,12,10,5,5,'9700000009','9700000009','022-1119',0,150000,1,1,1),
(10,'Prakash Gawde','Chembur','Mumbai','',7,'Service','ESI1010','PF1010','2022-07-01',NULL,12,11,12,11,5,5,'9700000010','9700000010','022-1120',0,150000,1,1,1),
(11,'Dinesh Pawar','Wadala','Mumbai','',7,'Service','ESI1011','PF1011','2023-01-10',NULL,12,12,12,12,5,5,'9700000011','9700000011','022-1121',0,150000,1,1,1),
(12,'Suresh Bhosale','Parel','Mumbai','',8,'Service','ESI1012','PF1012','2023-02-14',NULL,12,11,12,12,5,5,'9700000012','9700000012','022-1122',0,0,1,1,1),
(13,'Mahesh Kale','Byculla','Mumbai','',8,'Service','ESI1013','PF1013','2023-03-20',NULL,12,12,12,12,5,5,'9700000013','9700000013','022-1123',0,0,1,1,1),
(14,'Pooja Naik','Worli','Mumbai','',9,'Accounts','ESI1014','PF1014','2021-11-11',NULL,12,8,12,9,5,4,'9700000014','9700000014','022-1124',0,0,1,1,1),
(15,'Sneha Joshi','Lower Parel','Mumbai','',9,'Accounts','ESI1015','PF1015','2022-09-09',NULL,12,9,12,10,5,5,'9700000015','9700000015','022-1125',0,0,1,1,1),
(16,'Ramu Kaka','Kalbadevi','Mumbai','',10,'Housekeeping','ESI1016','PF1016','2020-12-01',NULL,12,10,12,11,5,5,'9700000016','9700000016','022-1126',0,0,1,1,1),
(17,'Laxman Patil','Girgaon','Mumbai','',10,'Housekeeping','ESI1017','PF1017','2021-04-04',NULL,12,11,12,12,5,5,'9700000017','9700000017','022-1127',0,0,1,1,1),
(18,'Naresh Shinde','Colaba','Mumbai','',5,'Kitchen','ESI1018','PF1018','2023-05-15',NULL,12,12,12,12,5,5,'9700000018','9700000018','022-1128',0,0,1,1,1),
(19,'Anil Desai','Fort','Mumbai','',6,'Service','ESI1019','PF1019','2020-08-08','2025-12-31',12,0,12,0,5,0,'9700000019','9700000019','022-1129',0,180000,0,1,1),
(20,'Kishore Rane','Mahim','Mumbai','',7,'Service','ESI1020','PF1020','2023-06-01',NULL,12,12,12,12,5,5,'9700000020','9700000020','022-1130',0,150000,1,1,1);

-- ================================================================
-- DAY BOOK
-- ================================================================
INSERT INTO day_book (id, name, group_code, gen_leg_code, is_active, created_by, updated_by) VALUES
-- Payment methods / collection day books
(1,'Cash Payment',4,1,1,1,1),
(2,'Credit Card',3,2,1,1,1),
(3,'Debit Card',3,2,1,1,1),
(4,'UPI - GPay',3,2,1,1,1),
(5,'UPI - PhonePe',3,2,1,1,1),
(6,'UPI - Paytm',3,3,1,1,1),
(7,'Net Banking',3,2,1,1,1),
(8,'Wallet',3,3,1,1,1),
(9,'Cheque',3,2,1,1,1);


-- ================================================================
-- PARTY BANK
-- ================================================================
INSERT INTO party_bank (id, name, location, is_active, created_by, updated_by) VALUES
(1,'HDFC Bank','Andheri Branch',1,1,1),
(2,'ICICI Bank','Bandra Branch',1,1,1),
(3,'State Bank of India','Dadar Branch',1,1,1),
(4,'Axis Bank','Kurla Branch',1,1,1),
(5,'Kotak Mahindra Bank','Thane Branch',1,1,1),
(6,'Bank of Baroda','Sion Branch',1,1,1),
(7,'Punjab National Bank','Ghatkopar Branch',1,1,1),
(8,'Canara Bank','Mulund Branch',1,1,1),
(9,'Yes Bank','Powai Branch',1,1,1),
(10,'IDFC First Bank','Chembur Branch',1,1,1);

-- ================================================================
-- ITEM GROUP  (raw material / store groups)
-- ================================================================
INSERT INTO item_group (id, name, payable, tally_code, item_rate, units_id, appli_service_tax, res_sale_mode, is_active, created_by, updated_by) VALUES
(1,'Vegetables',1,9,40,2,0,1,1,1,1),
(2,'Dairy Products',1,9,60,2,0,1,1,1,1),
(3,'Meat & Poultry',1,9,280,2,0,1,1,1,1),
(4,'Seafood',1,9,400,2,0,1,1,1,1),
(5,'Spices & Masala',1,9,200,2,0,0,1,1,1),
(6,'Grains & Pulses',1,9,80,2,0,0,1,1,1),
(7,'Oil & Ghee',1,9,150,4,0,0,1,1,1),
(8,'Beverages',1,3,30,10,1,1,1,1,1),
(9,'Liquor Stock',1,2,500,10,1,1,1,1,1),
(10,'Bakery Items',1,9,50,1,0,1,1,1,1),
(11,'Disposables',1,9,5,9,1,0,1,1,1),
(12,'Cleaning Supplies',1,9,80,1,1,0,1,1,1);

-- ================================================================
-- ITEM GROUP TAX DETAIL
-- ================================================================
INSERT INTO item_group_tax_detail (id, item_group_id, tax_id, tax_percentage, is_active, created_by, updated_by) VALUES
(1,1,6,5.0,1,1,1),
(2,2,6,5.0,1,1,1),
(3,3,6,5.0,1,1,1),
(4,4,6,5.0,1,1,1),
(5,5,6,5.0,1,1,1),
(6,6,6,5.0,1,1,1),
(7,7,7,12.0,1,1,1),
(8,8,8,18.0,1,1,1),
(9,9,4,20.0,1,1,1),
(10,10,6,5.0,1,1,1),
(11,11,8,18.0,1,1,1),
(12,12,8,18.0,1,1,1);

-- ================================================================
-- ITEM NAME  (30 stock items)
-- ================================================================
INSERT INTO item_name (id, name, item_group_id, item_rate_1, item_rate_2, item_rate_3, kitchen_section_id, is_active, created_by, updated_by) VALUES
(1,'Onion',1,30,32,35,1,1,1,1),
(2,'Tomato',1,40,42,45,1,1,1,1),
(3,'Potato',1,25,27,30,1,1,1,1),
(4,'Capsicum',1,60,65,70,1,1,1,1),
(5,'Green Chilli',1,80,85,90,1,1,1,1),
(6,'Paneer',2,320,330,340,1,1,1,1),
(7,'Butter',2,500,510,520,1,1,1,1),
(8,'Fresh Cream',2,220,230,240,1,1,1,1),
(9,'Curd',2,80,85,90,1,1,1,1),
(10,'Cheese',2,400,410,420,7,1,1,1),
(11,'Chicken',3,260,270,280,1,1,1,1),
(12,'Mutton',3,650,670,690,1,1,1,1),
(13,'Eggs',3,7,8,9,1,1,1,1),
(14,'Pomfret Fish',4,600,620,640,1,1,1,1),
(15,'Prawns',4,750,770,790,1,1,1,1),
(16,'Garam Masala',5,400,410,420,1,1,1,1),
(17,'Turmeric Powder',5,200,210,220,1,1,1,1),
(18,'Red Chilli Powder',5,300,310,320,1,1,1,1),
(19,'Basmati Rice',6,120,125,130,1,1,1,1),
(20,'Toor Dal',6,140,145,150,1,1,1,1),
(21,'Wheat Flour',6,45,48,50,1,1,1,1),
(22,'Sunflower Oil',7,140,145,150,1,1,1,1),
(23,'Pure Ghee',7,600,620,640,1,1,1,1),
(24,'Coca Cola 750ml',8,40,42,45,4,1,1,1),
(25,'Mineral Water 1L',8,20,22,25,4,1,1,1),
(26,'Kingfisher Beer',9,150,160,170,4,1,1,1),
(27,'Bread Loaf',10,40,42,45,5,1,1,1),
(28,'Pizza Base',10,30,32,35,7,1,1,1),
(29,'Paper Napkins',11,3,4,5,1,1,1,1),
(30,'Dishwash Liquid',12,180,185,190,1,1,1,1);

-- ================================================================
-- SUPPLIER MASTER  (15 suppliers)
-- ================================================================
INSERT INTO supplier_master (id, name, address1, address2, mobile_no1, mobile_no2, email_id, opening_bal, opening_crdr, closing_bal, closing_crdr, cust_type, tally_id, market_id, gst_percent, company_sr, is_active, created_by, updated_by) VALUES
(1,'Fresh Farm Vegetables','APMC Market','Vashi','9811000001','','freshfarm@gmail.com',15000,'C',22000,'C','C',11,2,5,1,1,1,1),
(2,'Mumbai Dairy Supplies','Aarey Road','Goregaon','9811000002','','mumbaidairy@gmail.com',8000,'C',12000,'C','C',11,2,5,1,1,1,1),
(3,'Royal Meat Suppliers','Crawford Market','Mumbai','9811000003','','royalmeat@gmail.com',25000,'C',31000,'C','C',11,2,5,1,1,1,1),
(4,'Sea Fresh Seafood','Sassoon Dock','Colaba','9811000004','','seafresh@gmail.com',18000,'C',9000,'C','D',11,2,5,1,1,1,1),
(5,'Spice World Traders','Lalbaug','Mumbai','9811000005','','spiceworld@gmail.com',12000,'C',15000,'C','C',12,2,5,1,1,1,1),
(6,'Grain House Wholesale','APMC Grain','Vashi','9811000006','','grainhouse@gmail.com',30000,'C',28000,'C','C',12,2,5,1,1,1,1),
(7,'Pure Oil Mills','Bhiwandi','Thane','9811000007','','pureoil@gmail.com',22000,'C',26000,'C','C',12,2,5,1,1,1,1),
(8,'Cool Beverages Dist','Andheri MIDC','Mumbai','9811000008','','coolbev@gmail.com',9000,'C',14000,'C','D',11,3,5,1,1,1,1),
(9,'United Liquor Agency','Lower Parel','Mumbai','9811000009','','unitedliquor@gmail.com',55000,'C',62000,'C','C',11,2,5,1,1,1,1),
(10,'Daily Bakery Products','Bandra','Mumbai','9811000010','','dailybakery@gmail.com',6000,'C',8000,'C','C',11,2,5,1,1,1,1),
(11,'EcoPack Disposables','Wagle Estate','Thane','9811000011','','ecopack@gmail.com',4000,'C',5000,'C','C',11,2,5,1,1,1,1),
(12,'Clean Pro Supplies','Kurla','Mumbai','9811000012','','cleanpro@gmail.com',3500,'C',4200,'C','C',11,2,5,1,1,1,1),
(13,'Metro Cash & Carry','Powai','Mumbai','9811000013','','metro@gmail.com',40000,'C',45000,'C','D',12,2,5,1,1,1,1),
(14,'Reliance Wholesale','Ghansoli','Navi Mumbai','9811000014','','reliancew@gmail.com',35000,'C',38000,'C','C',12,2,5,1,1,1,1),
(15,'Local Kirana Mart','Dadar','Mumbai','9811000015','','kiranamart@gmail.com',2000,'C',3000,'C','D',5,1,5,1,1,1,1);


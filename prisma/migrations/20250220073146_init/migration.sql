-- CreateTable
CREATE TABLE `blog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidBlog` VARCHAR(191) NOT NULL,
    `blogTitle` VARCHAR(255) NOT NULL,
    `blogContent` VARCHAR(191) NULL,
    `blogSlug` VARCHAR(191) NULL,
    `blogPublished` BOOLEAN NOT NULL DEFAULT false,
    `blogImage` VARCHAR(191) NULL,
    `blogBy` VARCHAR(191) NULL,
    `blogExt1` VARCHAR(191) NULL,
    `blogExt2` VARCHAR(191) NULL,
    `xStaus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Blog_pidBlog_key`(`pidBlog`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidContact` VARCHAR(191) NOT NULL,
    `contactSubject` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `contactMessage` VARCHAR(191) NULL,
    `contactStatus` VARCHAR(191) NULL,
    `contactExt1` VARCHAR(191) NULL,
    `contactExt2` VARCHAR(191) NULL,
    `xStaus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Contact_pidContact_key`(`pidContact`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faqs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidFaq` VARCHAR(191) NOT NULL,
    `faqQuestion` VARCHAR(191) NULL,
    `faqAnswer` VARCHAR(191) NULL,
    `faqStatus` VARCHAR(191) NULL,
    `faqExt1` VARCHAR(191) NULL,
    `faqExt2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Faqs_pidFaq_key`(`pidFaq`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidUser` VARCHAR(191) NOT NULL,
    `userFirstname` VARCHAR(191) NULL,
    `userLastname` VARCHAR(191) NULL,
    `userEmail` VARCHAR(191) NOT NULL,
    `userPassword` VARCHAR(191) NULL,
    `userSession` VARCHAR(191) NULL,
    `userPhone` INTEGER NULL,
    `userCid` VARCHAR(191) NULL,
    `userStatus` VARCHAR(191) NULL,
    `userAffiliateCode` VARCHAR(191) NULL,
    `userAffiliateRef` VARCHAR(191) NULL,
    `userImage` VARCHAR(191) NULL,
    `userFile` VARCHAR(191) NULL,
    `userExt1` VARCHAR(191) NULL,
    `userExt2` VARCHAR(191) NULL,
    `xStaus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `admin_pidUser_key`(`pidUser`),
    UNIQUE INDEX `admin_userEmail_key`(`userEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidUser` VARCHAR(191) NOT NULL,
    `userFirstname` VARCHAR(191) NULL,
    `userLastname` VARCHAR(191) NULL,
    `userEmail` VARCHAR(191) NOT NULL,
    `userPassword` VARCHAR(191) NULL,
    `userSession` VARCHAR(191) NULL,
    `cidStatus` VARCHAR(191) NULL,
    `loginStatus` VARCHAR(191) NULL,
    `loginKey` VARCHAR(191) NULL,
    `loginStamp` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `dob` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `bank_name` VARCHAR(191) NULL,
    `bank_account_number` VARCHAR(191) NULL,
    `bank_account_name` VARCHAR(191) NULL,
    `ref_id` VARCHAR(191) NULL,
    `userPhone` VARCHAR(191) NULL,
    `userCid` VARCHAR(191) NULL,
    `userShippingAddress` VARCHAR(191) NULL,
    `userShippingAddress2` VARCHAR(191) NULL,
    `userCountry` VARCHAR(191) NULL,
    `userState` VARCHAR(191) NULL,
    `userAffiliateCode` VARCHAR(191) NULL,
    `userAffiliateRef` VARCHAR(191) NULL,
    `userStatus` VARCHAR(191) NULL,
    `userImage` VARCHAR(191) NULL,
    `userFile` VARCHAR(191) NULL,
    `userExt1` VARCHAR(191) NULL,
    `userExt2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_pidUser_key`(`pidUser`),
    UNIQUE INDEX `users_userEmail_key`(`userEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidProduct` VARCHAR(191) NOT NULL,
    `pidOrder` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NULL,
    `productLink` VARCHAR(191) NULL,
    `productCategory` VARCHAR(191) NULL,
    `productPrice` DOUBLE NULL,
    `productWeight` DOUBLE NULL,
    `productQuantity` DOUBLE NULL,
    `productInfo` VARCHAR(191) NULL,
    `productStatus` VARCHAR(191) NULL,
    `pidAdmin` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `products_pidProduct_key`(`pidProduct`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidOrder` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NOT NULL,
    `orderName` VARCHAR(191) NULL,
    `destinationCountry` VARCHAR(191) NULL,
    `currencyType` VARCHAR(191) NULL,
    `shippingPlan` VARCHAR(191) NULL,
    `orderCategory` VARCHAR(191) NULL,
    `shippingAddress` VARCHAR(191) NULL,
    `orderShippingCost` VARCHAR(191) NULL,
    `orderTotalCost` VARCHAR(191) NULL,
    `orderWeight` VARCHAR(191) NULL,
    `orderStatus` VARCHAR(191) NULL,
    `orderType` VARCHAR(191) NULL,
    `orderPriority` VARCHAR(191) NULL,
    `vat` VARCHAR(191) NULL,
    `serviceCharge` VARCHAR(191) NULL,
    `exchangeRate1` VARCHAR(191) NULL,
    `exchangeRate2` VARCHAR(191) NULL,
    `exchangeRate3` VARCHAR(191) NULL,
    `shippingCost1` VARCHAR(191) NULL,
    `shippingCost2` VARCHAR(191) NULL,
    `shippingCost3` VARCHAR(191) NULL,
    `orderNote` VARCHAR(191) NULL,
    `pidAdmin` VARCHAR(191) NULL,
    `pidAdminLast` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `orders_pidOrder_key`(`pidOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidPayment` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NOT NULL,
    `payerName` VARCHAR(191) NOT NULL,
    `txID` VARCHAR(191) NOT NULL,
    `txRef` VARCHAR(191) NOT NULL,
    `paymentStatus` VARCHAR(191) NULL,
    `paymentType` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `serviceID` VARCHAR(191) NULL,
    `serviceName` VARCHAR(191) NULL,
    `serviceDescription` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `bankNumber` VARCHAR(191) NULL,
    `depositorName` VARCHAR(191) NULL,
    `affiliatePayStatus` VARCHAR(191) NULL,
    `affiliateRefId` VARCHAR(191) NULL,
    `txDateProcesser` VARCHAR(191) NULL,
    `txDateServer` VARCHAR(191) NULL,
    `status1` VARCHAR(191) NULL,
    `status2` VARCHAR(191) NULL,
    `paymentExt1` VARCHAR(191) NULL,
    `paymentExt2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `payments_pidPayment_key`(`pidPayment`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidSubscription` VARCHAR(191) NOT NULL,
    `subEmail` VARCHAR(191) NULL,
    `subStatus` VARCHAR(191) NULL,
    `subExt1` VARCHAR(191) NULL,
    `subExt2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `subscriptions_pidSubscription_key`(`pidSubscription`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `special_sourcing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidSpecialSourcing` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NULL,
    `whatsappNumber` VARCHAR(191) NULL,
    `productQualityRatings` VARCHAR(191) NULL,
    `targetUnitPrice` VARCHAR(191) NULL,
    `productDescription` VARCHAR(191) NULL,
    `productImage` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `special_sourcing_pidSpecialSourcing_key`(`pidSpecialSourcing`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pay_supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidPaySupplier` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NULL,
    `supplierName` VARCHAR(191) NULL,
    `supplierPhone` VARCHAR(191) NULL,
    `supplierEmail` VARCHAR(191) NULL,
    `aliPayAccountQRCodeImage` VARCHAR(191) NULL,
    `weChatAccountQRCodeImage` VARCHAR(191) NULL,
    `proformaInvoiceImage` VARCHAR(191) NULL,
    `supplierBankAccountDetails` VARCHAR(191) NULL,
    `amountToPayInYuan` VARCHAR(191) NULL,
    `amountToPayInNaira` VARCHAR(191) NULL,
    `serviceCharge` VARCHAR(191) NULL,
    `account_details1` VARCHAR(191) NULL,
    `account_details2` VARCHAR(191) NULL,
    `bank_account_details` VARCHAR(191) NULL,
    `amount_to_pay` VARCHAR(191) NULL,
    `additional_info` VARCHAR(191) NULL,
    `service_charge` VARCHAR(191) NULL,
    `vat` VARCHAR(191) NULL,
    `buy_rate` VARCHAR(191) NULL,
    `sell_rate` VARCHAR(191) NULL,
    `admin` VARCHAR(191) NULL,
    `admin_last` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `pay_supplier_pidPaySupplier_key`(`pidPaySupplier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipping_only` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidShippingOnly` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NULL,
    `whatsappNumber` VARCHAR(191) NULL,
    `shippingName` VARCHAR(191) NULL,
    `shippingTo` VARCHAR(191) NULL,
    `grossWeight` VARCHAR(191) NULL,
    `trackingNumber` VARCHAR(191) NULL,
    `shippingPlan` VARCHAR(191) NULL,
    `expectedShipments` VARCHAR(191) NULL,
    `wantProductVerification` BOOLEAN NULL,
    `wantConsolidation` BOOLEAN NULL,
    `multipleSuppliers` BOOLEAN NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `shipping_only_pidShippingOnly_key`(`pidShippingOnly`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verify_supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidVerifySupplier` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NULL,
    `supplierName` VARCHAR(191) NULL,
    `supplierPhone` VARCHAR(191) NULL,
    `supplierAddress` VARCHAR(191) NULL,
    `supplierProduct` VARCHAR(191) NULL,
    `supplierDetails` VARCHAR(191) NULL,
    `supplierWebsite` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `verify_supplier_pidVerifySupplier_key`(`pidVerifySupplier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affiliates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidUser` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `cid_status` VARCHAR(191) NULL,
    `login_status` VARCHAR(191) NULL,
    `login_key` VARCHAR(191) NULL,
    `login_stamp` VARCHAR(191) NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `dob_day` VARCHAR(191) NULL,
    `dob_month` VARCHAR(191) NULL,
    `dob_year` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `bank_name` VARCHAR(191) NULL,
    `bank_account_number` VARCHAR(191) NULL,
    `bank_account_name` VARCHAR(191) NULL,
    `affiliate_id` VARCHAR(191) NULL,
    `payout_request` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `affiliates_pidUser_key`(`pidUser`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidPayment` VARCHAR(191) NOT NULL,
    `pid_user` VARCHAR(191) NULL,
    `pid_order` VARCHAR(191) NULL,
    `tx_code` VARCHAR(191) NULL,
    `payment_status` VARCHAR(191) NULL,
    `payment_type` VARCHAR(191) NULL,
    `currency_type` VARCHAR(191) NULL,
    `amount` VARCHAR(191) NULL,
    `affiliate_pay_status` VARCHAR(191) NULL,
    `service_type` VARCHAR(191) NULL,
    `ref_id` VARCHAR(191) NULL,
    `tx_date_processor` VARCHAR(191) NULL,
    `tx_date_server` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `payment_records_pidPayment_key`(`pidPayment`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refund_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidRefund` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NULL,
    `pidOrder` VARCHAR(191) NULL,
    `amount` VARCHAR(191) NULL,
    `refundStatus` VARCHAR(191) NULL,
    `serviceType` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `refund_records_pidRefund_key`(`pidRefund`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidBankPayment` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NULL,
    `pidBank` VARCHAR(191) NULL,
    `pidOrder` VARCHAR(191) NULL,
    `amount` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `depositorName` VARCHAR(191) NULL,
    `trxNumber` VARCHAR(191) NULL,
    `serviceType` VARCHAR(191) NULL,
    `bankStatus` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `bank_payment_pidBankPayment_key`(`pidBankPayment`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidChat` VARCHAR(191) NOT NULL,
    `pidOrder` VARCHAR(191) NULL,
    `pidFrom` VARCHAR(191) NULL,
    `pidTo` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NULL,
    `messageTitle` VARCHAR(191) NULL,
    `messageContent` VARCHAR(191) NULL,
    `messageStatus` VARCHAR(191) NULL,
    `messageStatusUser` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `chats_pidChat_key`(`pidChat`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidMessage` VARCHAR(191) NOT NULL,
    `pidOrder` VARCHAR(191) NULL,
    `pidFrom` VARCHAR(191) NULL,
    `pidTo` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NULL,
    `messageTitle` VARCHAR(191) NULL,
    `messageContent` VARCHAR(191) NULL,
    `messageStatus` VARCHAR(191) NULL,
    `messageStatusUser` VARCHAR(191) NULL,
    `delStatus` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `messages_pidMessage_key`(`pidMessage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_rate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settings_name` VARCHAR(191) NULL,
    `currency_name1` VARCHAR(191) NULL,
    `currency_sign1` VARCHAR(191) NULL,
    `currency_name2` VARCHAR(191) NULL,
    `currency_sign2` VARCHAR(191) NULL,
    `currency_name3` VARCHAR(191) NULL,
    `currency_sign3` VARCHAR(191) NULL,
    `service_charge` VARCHAR(191) NULL,
    `vat` VARCHAR(191) NULL,
    `exNairaToDollar` VARCHAR(191) NULL,
    `exYuanToDollar` VARCHAR(191) NULL,
    `exNairaToYuan` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings_financial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settings_name` VARCHAR(191) NULL,
    `currency_name1` VARCHAR(191) NULL,
    `currency_sign1` VARCHAR(191) NULL,
    `currency_name2` VARCHAR(191) NULL,
    `currency_sign2` VARCHAR(191) NULL,
    `currency_name3` VARCHAR(191) NULL,
    `currency_sign3` VARCHAR(191) NULL,
    `service_charge` VARCHAR(191) NULL,
    `vat` VARCHAR(191) NULL,
    `exchange_rate1` VARCHAR(191) NULL,
    `exchange_rate2` VARCHAR(191) NULL,
    `exchange_rate3` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings_pay_supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `service_charge` VARCHAR(191) NULL,
    `vat` VARCHAR(191) NULL,
    `buy_rate` VARCHAR(191) NULL,
    `sell_rate` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings_shipping` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settings_name` VARCHAR(191) NOT NULL,
    `shipping_company_name` VARCHAR(191) NULL,
    `shipping_company_pid` VARCHAR(191) NULL,
    `shipping_company_info` VARCHAR(191) NULL,
    `shipping_name1` VARCHAR(191) NULL,
    `pid_shipping1` VARCHAR(191) NULL,
    `shipping_cost1` VARCHAR(191) NULL,
    `shipping_cost_suffix1` VARCHAR(191) NULL,
    `shipping_info1` VARCHAR(191) NULL,
    `shipping_name2` VARCHAR(191) NULL,
    `pid_shipping2` VARCHAR(191) NULL,
    `shipping_cost2` VARCHAR(191) NULL,
    `shipping_cost_suffix2` VARCHAR(191) NULL,
    `shipping_info2` VARCHAR(191) NULL,
    `shipping_name3` VARCHAR(191) NULL,
    `pid_shipping3` VARCHAR(191) NULL,
    `shipping_cost3` VARCHAR(191) NULL,
    `shipping_cost_suffix3` VARCHAR(191) NULL,
    `shipping_info3` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings_weight` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settings_name` VARCHAR(191) NULL,
    `minimum_weight` VARCHAR(191) NULL,
    `maximum_weight` VARCHAR(191) NULL,
    `additional_cost` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidCoupon` VARCHAR(191) NOT NULL,
    `pid_user` VARCHAR(191) NULL,
    `pid_order` VARCHAR(191) NULL,
    `coupon_code` VARCHAR(191) NULL,
    `coupon_value` VARCHAR(191) NULL,
    `coupon_value_amount` VARCHAR(191) NULL,
    `coupon_code_ref` VARCHAR(191) NULL,
    `coupon_type` VARCHAR(191) NULL,
    `coupon_status` VARCHAR(191) NULL,
    `coupon_validity` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `coupon_pidCoupon_key`(`pidCoupon`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_shipping_rate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `country_slug` VARCHAR(191) NULL,
    `country_name` VARCHAR(191) NULL,
    `shipping_rate` VARCHAR(191) NULL,
    `shipping_rate_cbm` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidBank` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NULL,
    `bankAccountName` VARCHAR(191) NULL,
    `bankAccountNumber` VARCHAR(191) NULL,
    `accountType` VARCHAR(191) NULL,
    `generalInfo` VARCHAR(191) NULL,
    `admin` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `banks_pidBank_key`(`pidBank`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faq` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidFaq` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NULL,
    `question` VARCHAR(191) NULL,
    `content` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `video_id` VARCHAR(191) NULL,
    `admin` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `faq_pidFaq_key`(`pidFaq`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidPost` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `content` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `author` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `posts_pidPost_key`(`pidPost`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidCountry` VARCHAR(191) NOT NULL,
    `countrySlug` VARCHAR(191) NULL,
    `countryName` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `country_pidCountry_key`(`pidCountry`),
    UNIQUE INDEX `country_countryName_key`(`countryName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shippingplan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidShippingPlan` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NOT NULL,
    `shippingPlanSlug` VARCHAR(191) NULL,
    `shippingPlanName` VARCHAR(191) NULL,
    `shippingPlanRate` DOUBLE NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `shippingplan_pidShippingPlan_key`(`pidShippingPlan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `buy_products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidProduct` VARCHAR(191) NOT NULL,
    `pidCategory` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NULL,
    `productPrice` DOUBLE NULL,
    `productInfo` VARCHAR(191) NULL,
    `productStatus` VARCHAR(191) NULL,
    `pidAdmin` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `buy_products_pidProduct_key`(`pidProduct`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `buy_category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidCategory` VARCHAR(191) NOT NULL,
    `pidUser` VARCHAR(191) NULL,
    `categoryName` VARCHAR(191) NULL,
    `productPrice` DOUBLE NULL,
    `categoryInfo` VARCHAR(191) NULL,
    `categoryStatus` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `buy_category_pidCategory_key`(`pidCategory`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_pidOrder_fkey` FOREIGN KEY (`pidOrder`) REFERENCES `orders`(`pidOrder`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_pidUser_fkey` FOREIGN KEY (`pidUser`) REFERENCES `users`(`pidUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shippingplan` ADD CONSTRAINT `shippingplan_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`pidCountry`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `buy_products` ADD CONSTRAINT `buy_products_pidCategory_fkey` FOREIGN KEY (`pidCategory`) REFERENCES `buy_category`(`pidCategory`) ON DELETE CASCADE ON UPDATE CASCADE;

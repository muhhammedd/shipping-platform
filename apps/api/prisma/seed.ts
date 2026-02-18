/**
 * Seed Script for Shipping Platform
 * Creates initial data for development and testing
 * 
 * Usage: npm run db:seed
 */

import { PrismaClient, UserRole, TenantStatus, BranchStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─────────────────────────────────────────
  // 1. Create Super Admin
  // ─────────────────────────────────────────
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 12);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@shipping-platform.com' },
    update: {},
    create: {
      email: 'superadmin@shipping-platform.com',
      name: 'Super Admin',
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      tenantId: null,
      branchId: null,
    },
  });
  console.log('✅ Created Super Admin:', superAdmin.email);

  // ─────────────────────────────────────────
  // 2. Create Tenant (Company)
  // ─────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'fast-shipping' },
    update: {},
    create: {
      name: 'Fast Shipping Co.',
      slug: 'fast-shipping',
      status: TenantStatus.ACTIVE,
      settings: {
        maxDeliveryAttempts: 3,
      },
    },
  });
  console.log('✅ Created Tenant:', tenant.name);

  // ─────────────────────────────────────────
  // 3. Create Company Admin
  // ─────────────────────────────────────────
  const companyAdminPassword = await bcrypt.hash('Admin123!', 12);
  
  const companyAdmin = await prisma.user.upsert({
    where: { email: 'admin@fast-shipping.com' },
    update: {},
    create: {
      email: 'admin@fast-shipping.com',
      name: 'Ahmed Company Admin',
      passwordHash: companyAdminPassword,
      role: UserRole.COMPANY_ADMIN,
      status: UserStatus.ACTIVE,
      tenantId: tenant.id,
      branchId: null,
    },
  });
  console.log('✅ Created Company Admin:', companyAdmin.email);

  // ─────────────────────────────────────────
  // 4. Create Branches
  // ─────────────────────────────────────────
  const cairoBranch = await prisma.branch.upsert({
    where: { id: 'branch-cairo-001' },
    update: {},
    create: {
      id: 'branch-cairo-001',
      tenantId: tenant.id,
      name: 'Cairo Main Branch',
      city: 'Cairo',
      address: '123 Tahrir Street, Downtown Cairo',
      status: BranchStatus.ACTIVE,
    },
  });
  console.log('✅ Created Branch:', cairoBranch.name);

  const alexandriaBranch = await prisma.branch.upsert({
    where: { id: 'branch-alex-001' },
    update: {},
    create: {
      id: 'branch-alex-001',
      tenantId: tenant.id,
      name: 'Alexandria Branch',
      city: 'Alexandria',
      address: '45 Corniche Road, Alexandria',
      status: BranchStatus.ACTIVE,
    },
  });
  console.log('✅ Created Branch:', alexandriaBranch.name);

  // ─────────────────────────────────────────
  // 5. Create Branch Managers
  // ─────────────────────────────────────────
  const branchManagerPassword = await bcrypt.hash('Manager123!', 12);
  
  const cairoManager = await prisma.user.upsert({
    where: { email: 'cairo.manager@fast-shipping.com' },
    update: {},
    create: {
      email: 'cairo.manager@fast-shipping.com',
      name: 'Mohamed Cairo Manager',
      phone: '+201234567890',
      passwordHash: branchManagerPassword,
      role: UserRole.BRANCH_MANAGER,
      status: UserStatus.ACTIVE,
      tenantId: tenant.id,
      branchId: cairoBranch.id,
    },
  });
  console.log('✅ Created Branch Manager:', cairoManager.email);

  const alexManager = await prisma.user.upsert({
    where: { email: 'alex.manager@fast-shipping.com' },
    update: {},
    create: {
      email: 'alex.manager@fast-shipping.com',
      name: 'Sara Alexandria Manager',
      phone: '+201098765432',
      passwordHash: branchManagerPassword,
      role: UserRole.BRANCH_MANAGER,
      status: UserStatus.ACTIVE,
      tenantId: tenant.id,
      branchId: alexandriaBranch.id,
    },
  });
  console.log('✅ Created Branch Manager:', alexManager.email);

  // ─────────────────────────────────────────
  // 6. Create Couriers
  // ─────────────────────────────────────────
  const courierPassword = await bcrypt.hash('Courier123!', 12);

  const couriers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'courier1@fast-shipping.com' },
      update: {},
      create: {
        email: 'courier1@fast-shipping.com',
        name: 'Ali Courier Cairo',
        phone: '+201111111111',
        passwordHash: courierPassword,
        role: UserRole.COURIER,
        status: UserStatus.ACTIVE,
        tenantId: tenant.id,
        branchId: cairoBranch.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'courier2@fast-shipping.com' },
      update: {},
      create: {
        email: 'courier2@fast-shipping.com',
        name: 'Omar Courier Cairo',
        phone: '+201222222222',
        passwordHash: courierPassword,
        role: UserRole.COURIER,
        status: UserStatus.ACTIVE,
        tenantId: tenant.id,
        branchId: cairoBranch.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'courier3@fast-shipping.com' },
      update: {},
      create: {
        email: 'courier3@fast-shipping.com',
        name: 'Hassan Courier Alex',
        phone: '+201333333333',
        passwordHash: courierPassword,
        role: UserRole.COURIER,
        status: UserStatus.ACTIVE,
        tenantId: tenant.id,
        branchId: alexandriaBranch.id,
      },
    }),
  ]);
  console.log(`✅ Created ${couriers.length} Couriers`);

  // ─────────────────────────────────────────
  // 7. Create Merchants
  // ─────────────────────────────────────────
  const merchantPassword = await bcrypt.hash('Merchant123!', 12);

  const merchants = await Promise.all([
    prisma.user.upsert({
      where: { email: 'merchant1@example.com' },
      update: {},
      create: {
        email: 'merchant1@example.com',
        name: 'Electronics Store',
        phone: '+204444444444',
        passwordHash: merchantPassword,
        role: UserRole.MERCHANT,
        status: UserStatus.ACTIVE,
        tenantId: tenant.id,
        branchId: null,
      },
    }),
    prisma.user.upsert({
      where: { email: 'merchant2@example.com' },
      update: {},
      create: {
        email: 'merchant2@example.com',
        name: 'Fashion Boutique',
        phone: '+205555555555',
        passwordHash: merchantPassword,
        role: UserRole.MERCHANT,
        status: UserStatus.ACTIVE,
        tenantId: tenant.id,
        branchId: null,
      },
    }),
    prisma.user.upsert({
      where: { email: 'merchant3@example.com' },
      update: {},
      create: {
        email: 'merchant3@example.com',
        name: 'Home Appliances Shop',
        phone: '+206666666666',
        passwordHash: merchantPassword,
        role: UserRole.MERCHANT,
        status: UserStatus.ACTIVE,
        tenantId: tenant.id,
        branchId: null,
      },
    }),
  ]);
  console.log(`✅ Created ${merchants.length} Merchants`);

  // ─────────────────────────────────────────
  // 8. Create Pricing Rules (Tenant Default)
  // ─────────────────────────────────────────
  const pricingRules = await Promise.all([
    // Cairo Zone
    prisma.pricingRule.upsert({
      where: { id: 'price-cairo-small' },
      update: {},
      create: {
        id: 'price-cairo-small',
        tenantId: tenant.id,
        merchantId: null,
        zone: 'Cairo',
        weightFrom: 0,
        weightTo: 5,
        basePrice: 25.00,
        isActive: true,
      },
    }),
    prisma.pricingRule.upsert({
      where: { id: 'price-cairo-medium' },
      update: {},
      create: {
        id: 'price-cairo-medium',
        tenantId: tenant.id,
        merchantId: null,
        zone: 'Cairo',
        weightFrom: 5,
        weightTo: 15,
        basePrice: 35.00,
        isActive: true,
      },
    }),
    prisma.pricingRule.upsert({
      where: { id: 'price-cairo-large' },
      update: {},
      create: {
        id: 'price-cairo-large',
        tenantId: tenant.id,
        merchantId: null,
        zone: 'Cairo',
        weightFrom: 15,
        weightTo: 50,
        basePrice: 50.00,
        isActive: true,
      },
    }),
    // Alexandria Zone
    prisma.pricingRule.upsert({
      where: { id: 'price-alex-small' },
      update: {},
      create: {
        id: 'price-alex-small',
        tenantId: tenant.id,
        merchantId: null,
        zone: 'Alexandria',
        weightFrom: 0,
        weightTo: 5,
        basePrice: 30.00,
        isActive: true,
      },
    }),
    prisma.pricingRule.upsert({
      where: { id: 'price-alex-medium' },
      update: {},
      create: {
        id: 'price-alex-medium',
        tenantId: tenant.id,
        merchantId: null,
        zone: 'Alexandria',
        weightFrom: 5,
        weightTo: 15,
        basePrice: 40.00,
        isActive: true,
      },
    }),
    // Other Cities
    prisma.pricingRule.upsert({
      where: { id: 'price-other-small' },
      update: {},
      create: {
        id: 'price-other-small',
        tenantId: tenant.id,
        merchantId: null,
        zone: 'Other',
        weightFrom: 0,
        weightTo: 5,
        basePrice: 35.00,
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ Created ${pricingRules.length} Pricing Rules`);

  // ─────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────
  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📋 Test Accounts:');
  console.log('─────────────────────────────────────────────────────');
  console.log('Super Admin:     superadmin@shipping-platform.com / SuperAdmin123!');
  console.log('Company Admin:   admin@fast-shipping.com / Admin123!');
  console.log('Branch Manager:  cairo.manager@fast-shipping.com / Manager123!');
  console.log('Branch Manager:  alex.manager@fast-shipping.com / Manager123!');
  console.log('Courier:         courier1@fast-shipping.com / Courier123!');
  console.log('Merchant:        merchant1@example.com / Merchant123!');
  console.log('─────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

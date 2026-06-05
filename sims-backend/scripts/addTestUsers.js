import bcrypt from 'bcryptjs';
import { sequelize } from '../src/models/index.js';
import { User } from '../src/models/index.js';

const addTestUsers = async () => {
  try {
    console.log('🔄 Adding test users...');

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);

    // Check and create admin user
    const adminExists = await User.findOne({ where: { email: 'admin@sims.com' } });
    if (!adminExists) {
      await User.create({
        email: 'admin@sims.com',
        password: adminPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        status: 'active',
      });
      console.log('✅ Admin user created: admin@sims.com (password: admin123)');
    } else {
      console.log('⏭️  Admin user already exists');
    }

    // Check and create manager user
    const managerExists = await User.findOne({ where: { email: 'manager@sims.com' } });
    if (!managerExists) {
      await User.create({
        email: 'manager@sims.com',
        password: managerPassword,
        first_name: 'Manager',
        last_name: 'User',
        role: 'manager',
        status: 'active',
      });
      console.log('✅ Manager user created: manager@sims.com (password: manager123)');
    } else {
      console.log('⏭️  Manager user already exists');
    }

    // Check and create staff user
    const staffExists = await User.findOne({ where: { email: 'staff@sims.com' } });
    if (!staffExists) {
      await User.create({
        email: 'staff@sims.com',
        password: staffPassword,
        first_name: 'Staff',
        last_name: 'User',
        role: 'staff',
        status: 'active',
      });
      console.log('✅ Staff user created: staff@sims.com (password: staff123)');
    } else {
      console.log('⏭️  Staff user already exists');
    }

    console.log('\n📋 Test Users Ready for Login:');
    console.log('─────────────────────────────────');
    console.log('Email: admin@sims.com');
    console.log('Password: admin123');
    console.log('Role: Admin');
    console.log('─────────────────────────────────');
    console.log('Email: manager@sims.com');
    console.log('Password: manager123');
    console.log('Role: Manager');
    console.log('─────────────────────────────────');
    console.log('Email: staff@sims.com');
    console.log('Password: staff123');
    console.log('Role: Staff');
    console.log('─────────────────────────────────\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test users:', error);
    process.exit(1);
  }
};

addTestUsers();

import bcrypt from 'bcryptjs';
import { sequelize, User } from '../src/models/index.js';

const fixTestUserPasswords = async () => {
  try {
    console.log('🔄 Updating test user passwords...');

    // Hash proper passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);

    // Update admin user
    await User.update(
      { password: adminPassword },
      { where: { email: 'admin@sims.com' } }
    );
    console.log('✅ Admin password updated');

    // Update manager user
    await User.update(
      { password: managerPassword },
      { where: { email: 'manager@sims.com' } }
    );
    console.log('✅ Manager password updated');

    // Update staff user
    await User.update(
      { password: staffPassword },
      { where: { email: 'staff@sims.com' } }
    );
    console.log('✅ Staff password updated');

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
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  }
};

fixTestUserPasswords();

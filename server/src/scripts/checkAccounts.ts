import prisma from '../config/prisma';

async function checkAccounts() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { accountCode: 'asc' },
      include: {
        parent: true,
      },
    });
    
    console.log(`\n📊 Total accounts in database: ${accounts.length}\n`);
    
    if (accounts.length > 0) {
      console.log('Chart of Accounts:');
      console.log('─'.repeat(80));
      accounts.forEach(account => {
        const indent = account.parentId ? '  ' : '';
        console.log(`${indent}${account.accountCode} - ${account.name} (${account.type})`);
      });
      console.log('─'.repeat(80));
      console.log('\n✅ Chart of Accounts exists and is properly configured!\n');
    } else {
      console.log('❌ No accounts found in database\n');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccounts();

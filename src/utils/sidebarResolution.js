const normalizeRoleKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

export const resolveSidebarKey = (roleOrType = '', path = '') => {
  const role = normalizeRoleKey(roleOrType)
  if (role === 'superadmin' || role === 'systemadmin' || role === 'sysadmin') return 'superadmin'
  if (role === 'owner' || role === 'clinicadmin' || role === 'clinicadministrator') return 'owner'
  if (role === 'manager') return 'manager'
  if (role === 'receptionist') return 'receptionist'
  if (role === 'practitioner') return 'practitioner'
  if (role === 'hr') return 'hr'
  if (role === 'finance') return 'finance'
  if (role === 'supply') return 'supply'
  if (role === 'cashier') return 'cashier'
  if (role === 'staff' || role === 'employee') return 'employee'
  if (role === 'customer') return 'customer'

  const routePath = String(path || '').toLowerCase()
  if (routePath.startsWith('/superadmin')) return 'superadmin'
  if (routePath.startsWith('/owner')) return 'owner'
  if (routePath.startsWith('/manager')) return 'manager'
  if (routePath.startsWith('/receptionist')) return 'receptionist'
  if (routePath.startsWith('/practitioner')) return 'practitioner'
  if (routePath.startsWith('/hr')) return 'hr'
  if (routePath.startsWith('/finance')) return 'finance'
  if (routePath.startsWith('/supply')) return 'supply'
  if (routePath.startsWith('/cashier')) return 'cashier'
  if (routePath.startsWith('/employee')) return 'employee'
  if (routePath.startsWith('/customer')) return 'customer'
  return ''
}

export const resolveSidebarComponentKey = (roleOrType = '', path = '') => resolveSidebarKey(roleOrType, path)

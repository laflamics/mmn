import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatDate } from '../lib/formatters';
import Dialog from '../components/Dialog';
import Table from '../components/Table';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role_id: '',
    department: '',
    is_active: true,
    password: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchPermissions();
    
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select(`
          *,
          roles(id, name)
        `)
        .order('name');
      if (err) {
        console.error('Error fetching users:', err);
        throw err;
      }
      setUsers(data || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error: err } = await supabase
        .from('roles')
        .select('id, name')
        .order('name');
      if (err) {
        console.error('Error fetching roles:', err);
        throw err;
      }
      setRoles(data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setRoles([]);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error: err } = await supabase
        .from('permissions')
        .select('id, module, name, description')
        .order('module, name');
      if (err) {
        console.error('Error fetching permissions:', err);
        throw err;
      }
      setPermissions(data || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setPermissions([]);
    }
  };

  const fetchUserPermissions = async (userId) => {
    try {
      const { data, error: err } = await supabase
        .from('user_permissions')
        .select('permission_id')
        .eq('user_id', userId);
      if (err) throw err;
      setUserPermissions(data.map(p => p.permission_id));
    } catch (err) {
      console.error('Error fetching user permissions:', err);
      setUserPermissions([]);
    }
  };

  const handleOpenDialog = () => {
    setEditingId(null);
    setUserPermissions([]);
    setShowDialog(true);
    setFormData({
      name: '',
      email: '',
      role_id: '',
      department: '',
      is_active: true,
      password: '',
    });
  };

  const handleEditClick = async (user) => {
    setEditingId(user.id);
    setShowDialog(true);
    setFormData({
      name: user.name,
      email: user.email,
      role_id: user.role_id || '',
      department: user.department || '',
      is_active: user.is_active,
      password: '',
    });
    await fetchUserPermissions(user.id);
  };

  const handleDeleteClick = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);
        if (deleteError) throw deleteError;
        setError('');
        fetchUsers();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handlePermissionToggle = (permissionId) => {
    setUserPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.email || !formData.role_id) {
        setError('Please fill in all required fields');
        return;
      }

      if (editingId) {
        // Update existing user via backend API
        const response = await fetch('/api/auth/update-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: editingId,
            name: formData.name,
            email: formData.email,
            role_id: parseInt(formData.role_id),
            department: formData.department,
            is_active: formData.is_active
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Update user error response:', errorData);
          throw new Error(errorData.error || 'Failed to update user');
        }

        // Update password if provided
        if (formData.password) {
          const passwordResponse = await fetch('/api/auth/update-user-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: editingId,
              password: formData.password
            })
          });

          if (!passwordResponse.ok) {
            const errorData = await passwordResponse.json();
            console.error('Password update error response:', errorData);
            throw new Error(errorData.error || 'Failed to update password');
          }
        }

        // Delete old permissions
        await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', editingId);

        // Insert new permissions
        if (userPermissions.length > 0) {
          const permissionsToInsert = userPermissions.map(permId => ({
            user_id: editingId,
            permission_id: permId
          }));
          const { error: permError } = await supabase
            .from('user_permissions')
            .insert(permissionsToInsert);
          if (permError) throw permError;
        }
      } else {
        // Create new user via backend API
        const response = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            role_id: formData.role_id,
            department: formData.department,
            is_active: true
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create user');
        }

        const { user, message } = await response.json();

        // Insert permissions
        if (userPermissions.length > 0) {
          const permissionsToInsert = userPermissions.map(permId => ({
            user_id: user.id,
            permission_id: permId
          }));
          const { error: permError } = await supabase
            .from('user_permissions')
            .insert(permissionsToInsert);
          if (permError) throw permError;
        }

        // Show success message
        setError(message || 'User created successfully');
      }

      setFormData({
        name: '',
        email: '',
        role_id: '',
        department: '',
        is_active: true,
        password: '',
      });
      setUserPermissions([]);
      setEditingId(null);
      setShowDialog(false);
      setError('');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingId(null);
    setUserPermissions([]);
    setFormData({
      name: '',
      email: '',
      role_id: '',
      department: '',
      is_active: true,
      password: '',
    });
    setError('');
  };

  const getRoleColor = (roleName) => {
    if (!roleName) return 'bg-slate-500/30 text-slate-200';
    const colors = {
      admin: 'bg-red-500/30 text-red-200',
      manager: 'bg-purple-500/30 text-purple-200',
      sales: 'bg-blue-500/30 text-blue-200',
      viewer: 'bg-slate-500/30 text-slate-200',
    };
    return colors[roleName.toLowerCase()] || 'bg-slate-500/30 text-slate-200';
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200';
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const columns = [
    { key: 'name', label: 'Name', width: '18%' },
    { key: 'email', label: 'Email', width: '20%' },
    { 
      key: 'role', 
      label: 'Role', 
      width: '12%',
      render: (_, row) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(row.roles?.name)}`}>
          {row.roles?.name || 'N/A'}
        </span>
      )
    },
    { key: 'department', label: 'Department', width: '15%' },
    { 
      key: 'is_active', 
      label: 'Status', 
      width: '10%',
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(val)}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { key: 'created_at', label: 'Created', width: '12%', render: (val) => formatDate(val) },
    {
      key: 'actions',
      label: 'Actions',
      width: '13%',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditClick(row)}
            className="px-3 py-1 text-xs bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded transition-smooth font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(row.id)}
            className="px-3 py-1 text-xs bg-red-500/30 text-red-200 hover:bg-red-500/50 rounded transition-smooth font-medium"
          >
            Delete
          </button>
        </div>
      )
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">User Access Management</h1>
        <button
          onClick={handleOpenDialog}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Add User
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title={editingId ? "Edit User" : "Add New User"}
        onClose={handleClose}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Update User" : "Create User"}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Full Name *</label>
            <input
              type="text"
              placeholder="Enter full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Email *</label>
            <input
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={editingId ? true : false}
              required
            />
            {!editingId && <p className="text-xs text-slate-500 mt-1">Temporary password will be sent to this email</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Role *</label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id} className="bg-slate-800">
                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Department</label>
              <input
                type="text"
                placeholder="e.g., Sales, Marketing"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 accent-blue-500"
            />
            <label htmlFor="is_active" className="text-xs font-medium text-slate-400">
              Active User
            </label>
          </div>

          {editingId && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Password {editingId ? '(leave empty to keep current)' : '*'}</label>
              <input
                type="password"
                placeholder={editingId ? "Leave empty to keep current password" : "Enter password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          {/* Permissions Section */}
          <div className="border-t border-slate-700 pt-4">
            <label className="block text-xs font-semibold text-slate-300 mb-3">Page Access Permissions</label>
            <div className="space-y-3">
              {Object.entries(groupedPermissions).map(([module, perms]) => {
                const modulePermIds = perms.map(p => p.id);
                const allSelected = modulePermIds.every(id => userPermissions.includes(id));
                const someSelected = modulePermIds.some(id => userPermissions.includes(id));
                
                return (
                  <div key={module}>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={() => {
                          if (allSelected) {
                            setUserPermissions(prev => prev.filter(id => !modulePermIds.includes(id)));
                          } else {
                            setUserPermissions(prev => [...new Set([...prev, ...modulePermIds])]);
                          }
                        }}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-300 capitalize">{module}</span>
                    </label>
                    <div className="space-y-2 ml-4">
                      {perms.map(perm => (
                        <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPermissions.includes(perm.id)}
                            onChange={() => handlePermissionToggle(perm.id)}
                            className="w-4 h-4 accent-blue-500"
                          />
                          <span className="text-xs text-slate-300">{perm.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Dialog>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <Table columns={columns} data={users} rowsPerPage={20} />
      )}
    </div>
  );
}

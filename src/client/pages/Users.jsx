import { useState } from 'react';
import Dialog from '../components/Dialog';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">User Access Management</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Add User
        </button>
      </div>

      <Dialog
        isOpen={showDialog}
        title="Add New User"
        onClose={() => setShowDialog(false)}
        onSubmit={() => setShowDialog(false)}
        submitLabel="Create User"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option className="bg-slate-800">Admin</option>
            <option className="bg-slate-800">Manager</option>
            <option className="bg-slate-800">Staff</option>
            <option className="bg-slate-800">Viewer</option>
          </select>
          <input
            type="text"
            placeholder="Department"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </Dialog>

      {users.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-slate-400 text-lg">No users yet</p>
          <p className="text-slate-500 text-sm mt-2">Add users to manage access control</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-200">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{user.department}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/30 text-green-200">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button className="text-blue-400 hover:text-blue-300">Edit</button>
                    <button className="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

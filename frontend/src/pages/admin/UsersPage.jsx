import { useState, useEffect } from 'react';
import api from '../../services/api';
import './UsersPage.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState('');

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      setErrorDetails(err.response?.data?.error || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleStatusChange = async (userId, currentStatus) => {
    try {
      await api.patch(`/users/${userId}/active`, { isActive: !currentStatus });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleResetPassword = () => {
    // Logic for generating temp password and showing modal
    alert('This would generate a temp password and force change on next login.');
  };

  if (isLoading) return <div className="users-page">Loading users...</div>;
  if (errorDetails) return <div className="users-page error">{errorDetails}</div>;

  return (
    <div className="users-page">
      <h2>User Management</h2>
      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <select 
                    value={u.role} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="role-select"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <span className={`status-badge ${u.lockedUntil && new Date(u.lockedUntil) > new Date() ? 'locked' : u.isActive ? 'active' : 'inactive'}`}>
                    {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? 'Locked' : u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
                <td className="actions-cell">
                  <button onClick={() => handleStatusChange(u.id, u.isActive)} className="btn-toggle">
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={handleResetPassword} className="btn-reset">Reset PW</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../api/admin';
import toast from 'react-hot-toast';
import { Users, Calendar, Shield, CreditCard } from 'lucide-react';

export default function AdminUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await adminApi.listUsers()).data,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role updated successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update user role';
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Users</h1>
        <p className="text-gray-400">Manage user accounts, roles, access permissions, and billing subscriptions.</p>
      </div>

      {isLoading ? (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-8 space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-12 bg-[#0f0f0f] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-12 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="font-semibold text-white">No users registered yet</p>
          <p className="text-xs text-gray-500 mt-1">Users will show up here as soon as they sign up.</p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#222] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4.5">User</th>
                  <th className="px-6 py-4.5">Email</th>
                  <th className="px-6 py-4.5">Plan / Billing</th>
                  <th className="px-6 py-4.5">System Role</th>
                  <th className="px-6 py-4.5">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] text-sm text-gray-300">
                {users.map((user) => {
                  const hasSubscription = !!user.subscription;
                  const isActive = user.subscription?.status === 'ACTIVE';
                  return (
                    <tr key={user.id} className="hover:bg-[#181818] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 text-sm font-bold shadow-inner">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-white">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{user.email}</td>
                      <td className="px-6 py-4">
                        {hasSubscription ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-white font-medium text-xs">
                              <CreditCard className="w-3.5 h-3.5 text-red-500" />
                              {user.subscription?.plan}
                            </span>
                            <span
                              className={`inline-flex items-center w-fit text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              }`}
                            >
                              {user.subscription?.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-xs">Free Tier</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-gray-500" />
                          <select
                            value={user.role}
                            onChange={(e) => roleMutation.mutate({ id: user.id, role: e.target.value })}
                            className="bg-[#0f0f0f] border border-[#2d2d2d] focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer hover:border-[#333] transition-colors"
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <span className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          {new Date(user.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

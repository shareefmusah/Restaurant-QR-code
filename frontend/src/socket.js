import { io } from 'socket.io-client';
import { api } from './api';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(api.base, { autoConnect: true });
  }
  return socket;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

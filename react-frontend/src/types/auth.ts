export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  profilePicture?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

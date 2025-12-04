/**
 * Auth Controller
 */

const { AuthService } = require('../services/auth.service');
const { asyncHandler } = require('@medassist/shared/errors/AppError');
const { HTTP_STATUS } = require('@medassist/shared/constants');
const { incrementAuthAttempts } = require('@medassist/shared/metrics/prometheus');
const config = require('../config');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);
  incrementAuthAttempts('register', 'success');
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: result
  });
});

/**
 * Verify OTP
 * POST /api/v1/auth/verify-otp
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await AuthService.verifyOTP(phone, otp);
  
  // Set cookies for tokens
  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes for access token
  };
  
  res.cookie('access_token', result.access_token, cookieOptions);
  res.cookie('refresh_token', result.refresh_token, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days for refresh token
  });
  
  res.json({
    success: true,
    data: result
  });
});

/**
 * Login
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email_or_phone, password } = req.body;
  
  try {
    const result = await AuthService.login(email_or_phone, password);
    
    // Check if user is not verified
    if (result.verified === false) {
      return res.status(HTTP_STATUS.OK).json({
        success: false,
        data: result
      });
    }
    
    incrementAuthAttempts('login', 'success');
    
    // Set cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    };
    
    res.cookie('access_token', result.access_token, cookieOptions);
    res.cookie('refresh_token', result.refresh_token, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    incrementAuthAttempts('login', 'failure');
    throw error;
  }
});

/**
 * Refresh token
 * POST /api/v1/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refresh_token || req.cookies.refresh_token;
  
  const result = await AuthService.refresh(refreshToken);
  incrementAuthAttempts('refresh', 'success');
  
  // Set cookies
  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  };
  
  res.cookie('access_token', result.access_token, cookieOptions);
  res.cookie('refresh_token', result.refresh_token, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  
  res.json({
    success: true,
    data: result
  });
});

/**
 * Logout
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refresh_token || req.cookies.refresh_token;
  
  await AuthService.logout(refreshToken);
  
  // Clear cookies
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Create pharmacist (admin only)
 * POST /api/v1/auth/admin/create-pharmacist
 */
const createPharmacist = asyncHandler(async (req, res) => {
  const result = await AuthService.createPharmacist(req.body);
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: result
  });
});

/**
 * Create driver (admin only)
 * POST /api/v1/auth/admin/create-driver
 */
const createDriver = asyncHandler(async (req, res) => {
  const result = await AuthService.createDriver(req.body);
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: result
  });
});

/**
 * Get current user
 * GET /api/v1/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await AuthService.getUserById(req.user.sub);
  
  res.json({
    success: true,
    data: { user }
  });
});

module.exports = {
  register,
  verifyOtp,
  login,
  refresh,
  logout,
  createPharmacist,
  createDriver,
  getCurrentUser
};

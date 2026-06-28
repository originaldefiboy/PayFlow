use soroban_sdk::{token, Address, Env};

use crate::errors::ContractError;
use crate::Subscription;

/// Verifies that `user` has granted the contract an allowance of at least
/// `min_amount` for `token`. Panics with `ContractError::InsufficientAllowance`
/// if the check fails.
pub fn check_allowance(env: &Env, user: &Address, token: &Address, min_amount: i128) {
    let client = token::Client::new(env, token);
    let allowance = client.allowance(user, &env.current_contract_address());
    if allowance < min_amount {
        env.panic_with_error(ContractError::InsufficientAllowance);
    }
}

/// Composable helper that asserts a subscription is ready to be used:
/// the subscription must be active and the user must have sufficient
/// allowance for the subscription's token and amount.
pub fn validate_subscription_readiness(env: &Env, user: &Address, sub: &Subscription) {
    if !sub.active {
        env.panic_with_error(ContractError::SubscriptionNotActive);
    }
    check_allowance(env, user, &sub.token, sub.amount);
}

/// Validates that `new_amount` is a legal subscription amount: must be positive
/// and must not exceed `MAX_SUBSCRIPTION_AMOUNT`. Panics with the appropriate
/// `ContractError` variant on failure.
pub fn require_valid_amount(env: &Env, new_amount: i128) {
    if new_amount <= 0 {
        env.panic_with_error(ContractError::AmountMustBePositive);
    }
    if new_amount > crate::MAX_SUBSCRIPTION_AMOUNT {
        env.panic_with_error(ContractError::AmountExceedsMaximum);
    }
}

/// Validates that `new_interval` is a legal subscription interval: must be
/// strictly greater than zero. Panics with `ContractError::IntervalTooShort`
/// if the floor is not met.
pub fn require_valid_interval(env: &Env, new_interval: u64) {
    if new_interval == 0 {
        env.panic_with_error(ContractError::IntervalTooShort);
    }
}

pub fn require_positive_interval(env: &Env, interval: u64) {
    if interval == 0 {
        env.panic_with_error(ContractError::IntervalMustBePositive);
    }
}

pub fn require_active_subscription(env: &Env, active: bool) {
    if !active {
        env.panic_with_error(ContractError::SubscriptionInactive);
    }
}

pub fn require_charge_interval_elapsed(env: &Env, now: u64, last_charged: u64, interval: u64) {
    if now < last_charged + interval {
        env.panic_with_error(ContractError::IntervalNotElapsed);
    }
}

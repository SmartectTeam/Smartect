package org.smartect.service;

import lombok.RequiredArgsConstructor;
import org.smartect.entity.UserEntity;
import org.smartect.repository.UserRepository;
import org.smartect.security.CustomUserDetails;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String userId)
            throws UsernameNotFoundException {

        UserEntity user = userRepository.findByUserId(userId)
                .orElseThrow(() ->
                        new UsernameNotFoundException("존재하지 않는 사용자"));

        return new CustomUserDetails(user);
    }
}

; ZAX lowered .asm trace
; range: $0100..$017B (end exclusive)

; func run_once begin
run_once:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push HL                        ; 0108: E5
push DE                        ; 0109: D5
push BC                        ; 010A: C5
push AF                        ; 010B: F5
ld A, (mode_value)             ; 010C: 3A 00 00
or A                           ; 010F: B7
jp nz, __zax_if_else_1         ; 0110: C2 00 00
ld A, $0001                    ; 0113: 3E 01
jp __zax_if_end_2              ; 0115: C3 00 00
__zax_if_else_1:
ld A, $0002                    ; 0118: 3E 02
__zax_if_end_2:
__zax_while_cond_3:
jp z, __zax_while_end_4        ; 011A: CA 00 00
dec A                          ; 011D: 3D
jp __zax_while_cond_3          ; 011E: C3 00 00
__zax_while_end_4:
ld A, $0001                    ; 0121: 3E 01
__zax_repeat_body_5:
dec A                          ; 0123: 3D
jp nz, __zax_repeat_body_5     ; 0124: C2 00 00
ld A, (mode_value)             ; 0127: 3A 00 00
jp __zax_select_dispatch_6     ; 012A: C3 00 00
__zax_case_8:
ld A, $000A                    ; 012D: 3E 0A
jp __zax_select_end_7          ; 012F: C3 00 00
__zax_case_9:
ld A, $0014                    ; 0132: 3E 14
jp __zax_select_end_7          ; 0134: C3 00 00
__zax_select_else_10:
ld A, $001E                    ; 0137: 3E 1E
jp __zax_select_end_7          ; 0139: C3 00 00
__zax_select_dispatch_6:
push HL                        ; 013C: E5
ld H, $0000                    ; 013D: 26 00
ld L, A                        ; 013F: 6F
ld a, l                        ; 0140: 7D
cp imm8                        ; 0141: FE 00
jp nz, __zax_select_next_11    ; 0143: C2 00 00
pop HL                         ; 0146: E1
jp __zax_case_8                ; 0147: C3 00 00
__zax_select_next_11:
cp imm8                        ; 014A: FE 01
jp nz, __zax_select_next_12    ; 014C: C2 00 00
pop HL                         ; 014F: E1
jp __zax_case_9                ; 0150: C3 00 00
__zax_select_next_12:
pop HL                         ; 0153: E1
jp __zax_select_else_10        ; 0154: C3 00 00
__zax_select_end_7:
ld (mode_value), A             ; 0157: 32 00 00
__zax_epilogue_0:
pop AF                         ; 015A: F1
pop BC                         ; 015B: C1
pop DE                         ; 015C: D1
pop HL                         ; 015D: E1
ld SP, IX                      ; 015E: DD F9
pop IX                         ; 0160: DD E1
ret                            ; 0162: C9
; func main begin
; func run_once end
main:
push IX                        ; 0163: DD E5
ld IX, $0000                   ; 0165: DD 21 00 00
add IX, SP                     ; 0169: DD 39
push HL                        ; 016B: E5
push DE                        ; 016C: D5
push BC                        ; 016D: C5
push AF                        ; 016E: F5
call run_once                  ; 016F: CD 00 00
__zax_epilogue_13:
pop AF                         ; 0172: F1
pop BC                         ; 0173: C1
pop DE                         ; 0174: D1
pop HL                         ; 0175: E1
ld SP, IX                      ; 0176: DD F9
pop IX                         ; 0178: DD E1
ret                            ; 017A: C9
; func main end

; symbols:
; label run_once = $0100
; label __zax_if_else_1 = $0118
; label __zax_if_end_2 = $011A
; label __zax_while_cond_3 = $011A
; label __zax_while_end_4 = $0121
; label __zax_repeat_body_5 = $0123
; label __zax_case_8 = $012D
; label __zax_case_9 = $0132
; label __zax_select_else_10 = $0137
; label __zax_select_dispatch_6 = $013C
; label __zax_select_next_11 = $014A
; label __zax_select_next_12 = $0153
; label __zax_select_end_7 = $0157
; label __zax_epilogue_0 = $015A
; label main = $0163
; label __zax_epilogue_13 = $0172
; var mode_value = $017C

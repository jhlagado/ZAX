; ZAX lowered .asm trace
; range: $0100..$1053 (end exclusive)

; func run_once begin
run_once:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push HL                        ; 010B: E5
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
__zax_repeat_cond_6:
jp nz, __zax_repeat_body_5     ; 0124: C2 00 00
__zax_repeat_end_7:
ld A, (mode_value)             ; 0127: 3A 00 00
jp __zax_select_dispatch_8     ; 012A: C3 00 00
__zax_case_10:
ld A, $000A                    ; 012D: 3E 0A
jp __zax_select_end_9          ; 012F: C3 00 00
__zax_case_11:
ld A, $0014                    ; 0132: 3E 14
jp __zax_select_end_9          ; 0134: C3 00 00
__zax_select_else_12:
ld A, $001E                    ; 0137: 3E 1E
jp __zax_select_end_9          ; 0139: C3 00 00
__zax_select_dispatch_8:
push HL                        ; 013C: E5
ld H, $0000                    ; 013D: 26 00
ld L, A                        ; 013F: 6F
ld a, l                        ; 0140: 7D
cp imm8                        ; 0141: FE 00
jp nz, __zax_select_next_13    ; 0143: C2 00 00
pop HL                         ; 0146: E1
jp __zax_case_10               ; 0147: C3 00 00
__zax_select_next_13:
cp imm8                        ; 014A: FE 01
jp nz, __zax_select_next_14    ; 014C: C2 00 00
pop HL                         ; 014F: E1
jp __zax_case_11               ; 0150: C3 00 00
__zax_select_next_14:
pop HL                         ; 0153: E1
jp __zax_select_else_12        ; 0154: C3 00 00
__zax_select_end_9:
ld (mode_value), A             ; 0157: 32 00 00
__zax_epilogue_0:
pop HL                         ; 015A: E1
pop DE                         ; 015B: D1
pop BC                         ; 015C: C1
pop AF                         ; 015D: F1
ld SP, IX                      ; 015E: DD F9
pop IX                         ; 0160: DD E1
ret                            ; 0162: C9
; func main begin
; func run_once end
main:
push IX                        ; 0163: DD E5
ld IX, $0000                   ; 0165: DD 21 00 00
add IX, SP                     ; 0169: DD 39
push AF                        ; 016B: F5
push BC                        ; 016C: C5
push DE                        ; 016D: D5
push HL                        ; 016E: E5
call run_once                  ; 016F: CD 00 00
__zax_epilogue_15:
pop HL                         ; 0172: E1
pop DE                         ; 0173: D1
pop BC                         ; 0174: C1
pop AF                         ; 0175: F1
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
; label __zax_repeat_cond_6 = $0124
; label __zax_repeat_end_7 = $0127
; label __zax_case_10 = $012D
; label __zax_case_11 = $0132
; label __zax_select_else_12 = $0137
; label __zax_select_dispatch_8 = $013C
; label __zax_select_next_13 = $014A
; label __zax_select_next_14 = $0153
; label __zax_select_end_9 = $0157
; label __zax_epilogue_0 = $015A
; label main = $0163
; label __zax_epilogue_15 = $0172
; data mode_value = $1000
; label __zax_startup = $1001

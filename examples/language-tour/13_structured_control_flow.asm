; ZAX lowered .asm trace
; range: $0100..$0163 (end exclusive)

; func run_once begin
run_once:
push AF                        ; 0100: F5
push BC                        ; 0101: C5
push DE                        ; 0102: D5
push HL                        ; 0103: E5
ld A, (mode_value)             ; 0104: 3A 00 00
or A                           ; 0107: B7
jp nz, __zax_if_else_1         ; 0108: C2 00 00
ld A, $0001                    ; 010B: 3E 01
jp __zax_if_end_2              ; 010D: C3 00 00
__zax_if_else_1:
ld A, $0002                    ; 0110: 3E 02
__zax_if_end_2:
__zax_while_cond_3:
jp z, __zax_while_end_4        ; 0112: CA 00 00
dec A                          ; 0115: 3D
jp __zax_while_cond_3          ; 0116: C3 00 00
__zax_while_end_4:
ld A, $0001                    ; 0119: 3E 01
__zax_repeat_body_5:
dec A                          ; 011B: 3D
jp nz, __zax_repeat_body_5     ; 011C: C2 00 00
ld A, (mode_value)             ; 011F: 3A 00 00
jp __zax_select_dispatch_6     ; 0122: C3 00 00
__zax_case_8:
ld A, $000A                    ; 0125: 3E 0A
jp __zax_select_end_7          ; 0127: C3 00 00
__zax_case_9:
ld A, $0014                    ; 012A: 3E 14
jp __zax_select_end_7          ; 012C: C3 00 00
__zax_select_else_10:
ld A, $001E                    ; 012F: 3E 1E
jp __zax_select_end_7          ; 0131: C3 00 00
__zax_select_dispatch_6:
push HL                        ; 0134: E5
ld H, $0000                    ; 0135: 26 00
ld L, A                        ; 0137: 6F
ld a, l                        ; 0138: 7D
cp imm8                        ; 0139: FE 00
jp nz, __zax_select_next_11    ; 013B: C2 00 00
pop HL                         ; 013E: E1
jp __zax_case_8                ; 013F: C3 00 00
__zax_select_next_11:
cp imm8                        ; 0142: FE 01
jp nz, __zax_select_next_12    ; 0144: C2 00 00
pop HL                         ; 0147: E1
jp __zax_case_9                ; 0148: C3 00 00
__zax_select_next_12:
pop HL                         ; 014B: E1
jp __zax_select_else_10        ; 014C: C3 00 00
__zax_select_end_7:
ld (mode_value), A             ; 014F: 32 00 00
__zax_epilogue_0:
pop HL                         ; 0152: E1
pop DE                         ; 0153: D1
pop BC                         ; 0154: C1
pop AF                         ; 0155: F1
ret                            ; 0156: C9
; func main begin
; func run_once end
main:
push AF                        ; 0157: F5
push BC                        ; 0158: C5
push DE                        ; 0159: D5
push HL                        ; 015A: E5
call run_once                  ; 015B: CD 00 00
__zax_epilogue_13:
pop HL                         ; 015E: E1
pop DE                         ; 015F: D1
pop BC                         ; 0160: C1
pop AF                         ; 0161: F1
ret                            ; 0162: C9
; func main end

; symbols:
; label run_once = $0100
; label __zax_if_else_1 = $0110
; label __zax_if_end_2 = $0112
; label __zax_while_cond_3 = $0112
; label __zax_while_end_4 = $0119
; label __zax_repeat_body_5 = $011B
; label __zax_case_8 = $0125
; label __zax_case_9 = $012A
; label __zax_select_else_10 = $012F
; label __zax_select_dispatch_6 = $0134
; label __zax_select_next_11 = $0142
; label __zax_select_next_12 = $014B
; label __zax_select_end_7 = $014F
; label __zax_epilogue_0 = $0152
; label main = $0157
; label __zax_epilogue_13 = $015E
; var mode_value = $0164

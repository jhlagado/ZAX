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
push AF                        ; 010C: F5
push BC                        ; 010D: C5
push DE                        ; 010E: D5
ld HL, mode_value              ; 010F: 21 00 00
pop DE                         ; 0112: D1
pop BC                         ; 0113: C1
pop AF                         ; 0114: F1
ld A, (hl)                     ; 0115: 7E
or A                           ; 0116: B7
jp nz, __zax_if_else_1         ; 0117: C2 00 00
ld A, $0001                    ; 011A: 3E 01
jp __zax_if_end_2              ; 011C: C3 00 00
__zax_if_else_1:
ld A, $0002                    ; 011F: 3E 02
__zax_if_end_2:
__zax_while_cond_3:
jp z, __zax_while_end_4        ; 0121: CA 00 00
dec A                          ; 0124: 3D
jp __zax_while_cond_3          ; 0125: C3 00 00
__zax_while_end_4:
ld A, $0001                    ; 0128: 3E 01
__zax_repeat_body_5:
dec A                          ; 012A: 3D
jp nz, __zax_repeat_body_5     ; 012B: C2 00 00
push AF                        ; 012E: F5
push BC                        ; 012F: C5
push DE                        ; 0130: D5
ld HL, mode_value              ; 0131: 21 00 00
pop DE                         ; 0134: D1
pop BC                         ; 0135: C1
pop AF                         ; 0136: F1
ld A, (hl)                     ; 0137: 7E
jp __zax_select_dispatch_6     ; 0138: C3 00 00
__zax_case_8:
ld A, $000A                    ; 013B: 3E 0A
jp __zax_select_end_7          ; 013D: C3 00 00
__zax_case_9:
ld A, $0014                    ; 0140: 3E 14
jp __zax_select_end_7          ; 0142: C3 00 00
__zax_select_else_10:
ld A, $001E                    ; 0145: 3E 1E
jp __zax_select_end_7          ; 0147: C3 00 00
__zax_select_dispatch_6:
push HL                        ; 014A: E5
ld H, $0000                    ; 014B: 26 00
ld L, A                        ; 014D: 6F
ld a, l                        ; 014E: 7D
cp imm8                        ; 014F: FE 00
jp nz, __zax_select_next_11    ; 0151: C2 00 00
pop HL                         ; 0154: E1
jp __zax_case_8                ; 0155: C3 00 00
__zax_select_next_11:
cp imm8                        ; 0158: FE 01
jp nz, __zax_select_next_12    ; 015A: C2 00 00
pop HL                         ; 015D: E1
jp __zax_case_9                ; 015E: C3 00 00
__zax_select_next_12:
pop HL                         ; 0161: E1
jp __zax_select_else_10        ; 0162: C3 00 00
__zax_select_end_7:
push AF                        ; 0165: F5
push BC                        ; 0166: C5
push DE                        ; 0167: D5
ld HL, mode_value              ; 0168: 21 00 00
pop DE                         ; 016B: D1
pop BC                         ; 016C: C1
pop AF                         ; 016D: F1
ld (hl), A                     ; 016E: 77
__zax_epilogue_0:
pop HL                         ; 016F: E1
pop DE                         ; 0170: D1
pop BC                         ; 0171: C1
pop AF                         ; 0172: F1
ld SP, IX                      ; 0173: DD F9
pop IX                         ; 0175: DD E1
ret                            ; 0177: C9
; func main begin
; func run_once end
main:
push IX                        ; 0178: DD E5
ld IX, $0000                   ; 017A: DD 21 00 00
add IX, SP                     ; 017E: DD 39
push AF                        ; 0180: F5
push BC                        ; 0181: C5
push DE                        ; 0182: D5
push HL                        ; 0183: E5
call run_once                  ; 0184: CD 00 00
__zax_epilogue_13:
pop HL                         ; 0187: E1
pop DE                         ; 0188: D1
pop BC                         ; 0189: C1
pop AF                         ; 018A: F1
ld SP, IX                      ; 018B: DD F9
pop IX                         ; 018D: DD E1
ret                            ; 018F: C9
; func main end

; symbols:
; label run_once = $0100
; label __zax_if_else_1 = $011F
; label __zax_if_end_2 = $0121
; label __zax_while_cond_3 = $0121
; label __zax_while_end_4 = $0128
; label __zax_repeat_body_5 = $012A
; label __zax_case_8 = $013B
; label __zax_case_9 = $0140
; label __zax_select_else_10 = $0145
; label __zax_select_dispatch_6 = $014A
; label __zax_select_next_11 = $0158
; label __zax_select_next_12 = $0161
; label __zax_select_end_7 = $0165
; label __zax_epilogue_0 = $016F
; label main = $0178
; label __zax_epilogue_13 = $0187
; data mode_value = $1000
; label __zax_startup = $1001

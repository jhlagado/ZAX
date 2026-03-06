; ZAX lowered .asm trace
; range: $0100..$206B (end exclusive)

; func byte_fvar_glob begin
byte_fvar_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
push HL                        ; 010C: E5
ld E, (IX + $0004)             ; 010D: DD 5E 04
ld D, (IX + $0005)             ; 0110: DD 56 05
ld hl, (glob_idx_word)         ; 0113: 2A 00 00
add HL, DE                     ; 0116: 19
ld A, (HL)                     ; 0117: 7E
pop HL                         ; 0118: E1
pop DE                         ; 0119: D1
push DE                        ; 011A: D5
push HL                        ; 011B: E5
ld E, (IX + $0004)             ; 011C: DD 5E 04
ld D, (IX + $0005)             ; 011F: DD 56 05
ld hl, (glob_idx_word)         ; 0122: 2A 00 00
add HL, DE                     ; 0125: 19
ld (HL), A                     ; 0126: 77
pop HL                         ; 0127: E1
pop DE                         ; 0128: D1
ld H, $0000                    ; 0129: 26 00
ld L, A                        ; 012B: 6F
__zax_epilogue_0:
pop DE                         ; 012C: D1
pop BC                         ; 012D: C1
pop AF                         ; 012E: F1
ld SP, IX                      ; 012F: DD F9
pop IX                         ; 0131: DD E1
ret                            ; 0133: C9
; func byte_fvar_glob end
; func main begin
main:
push IX                        ; 0134: DD E5
ld IX, $0000                   ; 0136: DD 21 00 00
add IX, SP                     ; 013A: DD 39
push AF                        ; 013C: F5
push BC                        ; 013D: C5
push DE                        ; 013E: D5
push HL                        ; 013F: E5
ld HL, glob_bytes              ; 0140: 21 00 00
push HL                        ; 0143: E5
call byte_fvar_glob            ; 0144: CD 00 00
inc SP                         ; 0147: 33
inc SP                         ; 0148: 33
__zax_epilogue_1:
pop HL                         ; 0149: E1
pop DE                         ; 014A: D1
pop BC                         ; 014B: C1
pop AF                         ; 014C: F1
ld SP, IX                      ; 014D: DD F9
pop IX                         ; 014F: DD E1
ret                            ; 0151: C9
; func main end

; symbols:
; label byte_fvar_glob = $0100
; label __zax_epilogue_0 = $012C
; label main = $0134
; label __zax_epilogue_1 = $0149
; data glob_bytes = $2000
; data glob_idx_word = $2008
; label __zax_startup = $200A
